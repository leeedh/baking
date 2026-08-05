'use client';

import SecureVideoPlayer from '@/components/player/SecureVideoPlayer';
import { useRouter } from '@/i18n/navigation';
import { readError } from '@/lib/api/read-error';
import { formatBytes } from '@/lib/format';
import type { LessonProgress, PlayerChapter, PlayerLesson } from '@/lib/lessons';
import type { MaterialItem } from '@/lib/materials';
import { BookOpen, CheckCircle, ChevronLeft, FileDown, Lock, PlayCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

interface PlayerScreenProps {
  classId: string;
  /** 서버에서 조회한 코스 제목 (course_catalog 실데이터) */
  courseTitle: string;
  /** 표기용 강사명 */
  instructorName: string;
  /** 서버에서 enrollments로 판별한 활성 수강권 보유 여부 */
  purchased: boolean;
  /** DB lessons(챕터별 그룹) — EPIC-E 실연동 */
  chapters: PlayerChapter[];
  /** 차시별 진도 맵 (lessonId → 진도) */
  progress: Record<string, LessonProgress>;
  /** 부분 마스킹된 워터마크 식별자 (비로그인 시 빈 문자열) */
  watermarkLabel: string;
  /** 차시별 레시피 자료 (비구매자에겐 빈 맵 — DC-59) */
  materials: Record<string, MaterialItem[]>;
}

function formatDuration(sec: number | null): string {
  if (!sec || sec <= 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function PlayerScreen({
  classId,
  courseTitle,
  instructorName,
  purchased,
  chapters,
  progress,
  watermarkLabel,
  materials,
}: PlayerScreenProps) {
  const router = useRouter();
  const t = useTranslations('player');
  const onNavigateBack = () => router.push(`/classes/${classId}`);
  // 재생 중인 차시는 URL이 소스다(코드리뷰 M-10). 예전에는 ?lesson=을 useState 초기값으로만
  // 읽어서, 뒤로/앞으로 가면 주소는 바뀌는데 재생 차시는 그대로인 불일치가 생겼다.
  const lessonParam = useSearchParams().get('lesson');

  const allLessons = useMemo(() => chapters.flatMap((c) => c.lessons), [chapters]);
  const currentLesson = useMemo(
    () => allLessons.find((l) => l.id === lessonParam) ?? allLessons[0] ?? null,
    [allLessons, lessonParam],
  );

  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(() =>
    Object.entries(progress)
      .filter(([, p]) => p.completed)
      .map(([id]) => id),
  );
  // 자료 다운로드 중인 항목과 실패 사유(alert 대신 인라인 표시).
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [materialError, setMaterialError] = useState<string | null>(null);
  // 완강 등록 실패 사유 — materialError와 같은 인라인 표시 방식을 따른다.
  const [completeError, setCompleteError] = useState<string | null>(null);

  const totalLessonsCount = allLessons.length;
  const progressPercent =
    totalLessonsCount > 0 ? Math.round((completedLessonIds.length / totalLessonsCount) * 100) : 0;

  const isLocked = (lesson: PlayerLesson) => !purchased && !lesson.isPreview;

  const handleLessonSelect = (lesson: PlayerLesson) => {
    if (isLocked(lesson)) {
      alert(t('lockedLesson'));
      return;
    }
    // replace(≠push) — 차시 전환마다 히스토리가 쌓이면 뒤로가기로 강좌 상세에 못 돌아간다.
    router.replace(`/learn/${classId}?lesson=${lesson.id}`, { scroll: false });
  };

  const handleCompleteCurrentLesson = async () => {
    const lesson = currentLesson;
    if (!lesson || completedLessonIds.includes(lesson.id)) return;

    // 낙관적으로 먼저 체크하되, 서버가 거부하면 되돌린다(코드리뷰 M-7).
    // 예전에는 .catch(() => {})로 실패를 삼켜 새로고침하면 완강이 사라졌다.
    setCompletedLessonIds((ids) => [...ids, lesson.id]);
    setCompleteError(null);
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: lesson.id,
          watchedSec: lesson.durationSec ?? 0,
          completed: true,
        }),
      });
      if (!res.ok) {
        setCompletedLessonIds((ids) => ids.filter((id) => id !== lesson.id));
        setCompleteError(await readError(res));
        return;
      }
      // 완강 여부의 진실은 서버가 정한다(진도 정책은 lib/progress/policy.ts).
      const body = (await res.json()) as { completed?: boolean };
      if (body.completed === false) {
        setCompletedLessonIds((ids) => ids.filter((id) => id !== lesson.id));
        setCompleteError(t('completeNotEnough'));
      }
    } catch {
      setCompletedLessonIds((ids) => ids.filter((id) => id !== lesson.id));
      setCompleteError(t('completeNetworkError'));
    }
  };

  // 서명 URL은 60초짜리 단기 발급 — 클릭 시점에 받아 즉시 사용한다(사전 발급·캐시 금지).
  const handleDownloadMaterial = async (material: MaterialItem) => {
    setDownloadingId(material.id);
    setMaterialError(null);
    try {
      const res = await fetch(`/api/materials/${material.id}/download`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { detail?: string } | null;
        setMaterialError(body?.detail ?? t('materialFailed'));
        return;
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch {
      setMaterialError(t('materialNetworkError'));
    } finally {
      setDownloadingId(null);
    }
  };

  const currentLocked = currentLesson ? isLocked(currentLesson) : true;
  const currentMaterials = currentLesson ? (materials[currentLesson.id] ?? []) : [];

  return (
    <div id="player-screen" className="bg-cream py-6 px-4 sm:px-8 max-w-7xl mx-auto">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-brown-light">
        <div>
          <button
            onClick={onNavigateBack}
            className="flex items-center gap-1 text-xs text-brown-medium hover:text-terracotta hover:underline mb-1 cursor-pointer"
          >
            <ChevronLeft size={14} /> {t('backToDetail')}
          </button>
          <h1 className="font-serif text-lg sm:text-xl font-bold text-brown">{courseTitle}</h1>
          <p className="text-xs text-brown-medium">
            {t('instructorLabel', { name: instructorName })} •{' '}
            {purchased ? t('statusPurchased') : t('statusPreview')}
          </p>
        </div>

        {/* Global Progress Rate Bar */}
        <div className="bg-white p-3 rounded-xl border border-brown-light w-full sm:w-64 space-y-1.5 self-stretch sm:self-auto shadow-sm">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-brown-medium">{t('progressLabel')}</span>
            <span className="text-terracotta font-mono">
              {t('progressPercent', { percent: progressPercent })}
            </span>
          </div>
          <div className="w-full bg-cream h-2 rounded-full overflow-hidden">
            <div
              className="bg-terracotta h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-brown-medium/60">
            <span>{t('completedCount', { count: completedLessonIds.length })}</span>
            <span>{t('totalCount', { count: totalLessonsCount })}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* WIDESCREEN 16:9 VIDEO PLAYER AREA */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative aspect-[16/9] bg-black rounded-2xl overflow-hidden shadow-xl border-2 border-white">
            {!currentLesson ? (
              <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
                {t('noLessons')}
              </div>
            ) : currentLocked ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-white/80">
                <Lock size={24} className="text-terracotta" />
                <p className="text-sm">{t('lockedNotice')}</p>
              </div>
            ) : (
              <SecureVideoPlayer
                key={currentLesson.id}
                lessonId={currentLesson.id}
                title={currentLesson.title}
                watermarkLabel={watermarkLabel}
                initialWatchedSec={progress[currentLesson.id]?.watchedSec ?? 0}
              />
            )}
          </div>

          {/* Quick interactive task controls */}
          {currentLesson && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white rounded-xl border border-brown-light gap-4 shadow-sm">
              <div>
                <span className="text-[10px] font-bold text-gold tracking-wide uppercase">
                  Lecture Playing
                </span>
                <h3 className="text-sm font-bold text-brown mt-0.5">{currentLesson.title}</h3>
                <p className="text-xs text-brown-medium mt-1">
                  {currentLesson.isPreview ? t('lessonPreviewNote') : t('lessonMemberNote')}
                </p>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                <button
                  id="btn-mark-complete"
                  onClick={handleCompleteCurrentLesson}
                  disabled={currentLocked}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    completedLessonIds.includes(currentLesson.id)
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-cream text-terracotta border border-brown-light hover:bg-terracotta hover:text-white'
                  }`}
                >
                  <CheckCircle size={14} />
                  {completedLessonIds.includes(currentLesson.id)
                    ? t('completeDone')
                    : t('completeCta')}
                </button>
              </div>

              {completeError && (
                <p role="alert" className="w-full text-xs text-terracotta sm:order-last">
                  {completeError}
                </p>
              )}
            </div>
          )}

          {/* 차시 레시피 자료 — 수강권 보유자에게만 목록이 내려오고, 클릭 시 60초 서명 URL 발급 */}
          {currentLesson && (
            <div className="p-4 bg-white rounded-xl border border-brown-light space-y-2 shadow-sm">
              <h4 className="text-xs font-bold text-brown flex items-center gap-1">
                <FileDown size={14} className="text-gold" />
                {t('materialsTitle')}
              </h4>

              {currentMaterials.length === 0 ? (
                <p className="text-xs text-brown-medium/70">
                  {purchased ? t('materialsEmpty') : t('materialsLocked')}
                </p>
              ) : (
                <ul className="space-y-1">
                  {currentMaterials.map((material) => (
                    <li key={material.id}>
                      <button
                        type="button"
                        disabled={downloadingId === material.id}
                        onClick={() => handleDownloadMaterial(material)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-cream hover:bg-brown-light disabled:opacity-50 text-xs text-brown transition-colors cursor-pointer"
                      >
                        <span className="text-left">{material.title}</span>
                        <span className="text-[10px] text-brown-medium/70 font-mono shrink-0">
                          {downloadingId === material.id
                            ? t('materialIssuing')
                            : formatBytes(material.sizeBytes)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {materialError && (
                <p role="alert" className="text-[11px] text-terracotta">
                  {materialError}
                </p>
              )}
            </div>
          )}

          {/* Notes summary for student */}
          <div className="bg-white p-6 rounded-2xl border border-brown-light space-y-4">
            <h4 className="font-serif text-sm font-bold text-brown border-b border-cream pb-2">
              {t('summaryTitle')}
            </h4>
            <div className="text-xs text-brown-medium space-y-3 leading-relaxed">
              <p>
                <strong className="text-terracotta">{t('summaryPoint1Label')}</strong>{' '}
                {t('summaryPoint1Body')}
              </p>
              <p>
                <strong className="text-gold">{t('summaryPoint2Label')}</strong>{' '}
                {t('summaryPoint2Body')}
              </p>
            </div>
          </div>
        </div>

        {/* SIDEBAR LESSON CHANGER */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-brown-light p-5 space-y-4">
          <div className="border-b border-cream pb-3">
            <h3 className="font-serif text-sm font-bold text-brown flex items-center gap-1.5">
              <BookOpen size={16} className="text-terracotta" /> {t('lessonListTitle')}
            </h3>
            <p className="text-[10px] text-brown-medium mt-0.5">
              {t('lessonListHint')}
            </p>
          </div>

          <div className="space-y-4 max-h-[300px] sm:max-h-[500px] overflow-y-auto pr-1">
            {chapters.map((chapter) => (
              <div key={chapter.index} className="space-y-2">
                <span className="text-[10.5px] font-bold text-gold block uppercase tracking-wider bg-cream p-1.5 rounded">
                  {chapter.title}
                </span>

                <div className="space-y-1">
                  {chapter.lessons.map((lesson) => {
                    const isSelected = lesson.id === currentLesson?.id;
                    const isCompleted = completedLessonIds.includes(lesson.id);
                    const locked = isLocked(lesson);

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => handleLessonSelect(lesson)}
                        disabled={locked}
                        className={`w-full p-2.5 min-h-[44px] rounded-lg flex items-center justify-between text-left text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-terracotta/10 text-terracotta font-bold'
                            : locked
                              ? 'opacity-50 bg-cream/30 text-brown-medium/60 cursor-not-allowed'
                              : 'hover:bg-cream text-brown'
                        }`}
                      >
                        <div className="flex items-center gap-2 max-w-[85%]">
                          {isCompleted ? (
                            <span className="text-emerald-600 shrink-0">
                              <CheckCircle size={14} className="fill-emerald-100" />
                            </span>
                          ) : isSelected ? (
                            <span className="text-terracotta shrink-0 animate-bounce">
                              <PlayCircle size={14} />
                            </span>
                          ) : (
                            <span className="text-brown-medium/40 shrink-0">•</span>
                          )}
                          <span className="truncate">{lesson.title}</span>
                        </div>

                        <div className="flex items-center gap-1 text-[9px] text-brown-medium/60 font-mono">
                          {locked ? (
                            <span className="text-[8px] bg-gold/10 text-gold px-1 rounded">
                              {t('lessonLocked')}
                            </span>
                          ) : (
                            <span>{formatDuration(lesson.durationSec)}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {!purchased && (
            <div className="bg-terracotta/5 border border-terracotta/20 rounded-xl p-3 text-center space-y-2">
              <span className="text-[10.5px] font-bold text-terracotta block">
                {t('upsellTitle')}
              </span>
              <p className="text-[9px] text-brown-medium leading-normal font-light">
                {t('upsellBody')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
