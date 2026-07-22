'use client';

import SecureVideoPlayer from '@/components/player/SecureVideoPlayer';
import { useRouter } from '@/i18n/navigation';
import type { LessonProgress, PlayerChapter, PlayerLesson } from '@/lib/lessons';
import { useClassById } from '@/lib/store';
import { BookOpen, CheckCircle, ChevronLeft, FileDown, Lock, PlayCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

interface PlayerScreenProps {
  classId: string;
  /** 서버에서 enrollments로 판별한 활성 수강권 보유 여부 */
  purchased: boolean;
  /** DB lessons(챕터별 그룹) — EPIC-E 실연동 */
  chapters: PlayerChapter[];
  /** 차시별 진도 맵 (lessonId → 진도) */
  progress: Record<string, LessonProgress>;
  /** 부분 마스킹된 워터마크 식별자 (비로그인 시 빈 문자열) */
  watermarkLabel: string;
}

function formatDuration(sec: number | null): string {
  if (!sec || sec <= 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function PlayerScreen({
  classId,
  purchased,
  chapters,
  progress,
  watermarkLabel,
}: PlayerScreenProps) {
  const cls = useClassById(classId);
  const router = useRouter();
  const onNavigateBack = () => router.push(`/classes/${cls.id}`);
  const initialLessonId = useSearchParams().get('lesson');

  const allLessons = useMemo(() => chapters.flatMap((c) => c.lessons), [chapters]);
  const defaultLesson = allLessons.find((l) => l.id === initialLessonId) ?? allLessons[0] ?? null;

  const [currentLesson, setCurrentLesson] = useState<PlayerLesson | null>(defaultLesson);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(() =>
    Object.entries(progress)
      .filter(([, p]) => p.completed)
      .map(([id]) => id),
  );
  const [pdfDownloaded, setPdfDownloaded] = useState(false);

  const totalLessonsCount = allLessons.length;
  const progressPercent =
    totalLessonsCount > 0 ? Math.round((completedLessonIds.length / totalLessonsCount) * 100) : 0;

  const isLocked = (lesson: PlayerLesson) => !purchased && !lesson.isPreview;

  const handleLessonSelect = (lesson: PlayerLesson) => {
    if (isLocked(lesson)) {
      alert(
        '본 차시는 평생소장 라이선스를 구매하셔야 수강하실 수 있습니다. 1차시 무료 맛보기를 즐겨주세요!',
      );
      return;
    }
    setCurrentLesson(lesson);
  };

  const handleCompleteCurrentLesson = () => {
    if (!currentLesson || completedLessonIds.includes(currentLesson.id)) return;
    setCompletedLessonIds((ids) => [...ids, currentLesson.id]);
    // 완주 등록도 progress upsert로 서버 저장 (completed=true).
    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonId: currentLesson.id,
        watchedSec: currentLesson.durationSec ?? 0,
        completed: true,
      }),
    }).catch(() => {});
  };

  const handleDownloadPDF = () => {
    setPdfDownloaded(true);
    setTimeout(() => setPdfDownloaded(false), 4000);
  };

  const currentLocked = currentLesson ? isLocked(currentLesson) : true;

  return (
    <div id="player-screen" className="bg-[#FAF4EA] py-6 px-4 sm:px-8 max-w-7xl mx-auto">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-[#EFE8DC]">
        <div>
          <button
            onClick={onNavigateBack}
            className="flex items-center gap-1 text-xs text-[#5F4E43] hover:text-[#B65538] hover:underline mb-1 cursor-pointer"
          >
            <ChevronLeft size={14} /> 클래스 상세 페이지로 돌아가기
          </button>
          <h1 className="font-serif text-lg sm:text-xl font-bold text-[#2A211B]">{cls.title}</h1>
          <p className="text-xs text-[#5F4E43]">
            강사: {cls.instructor} •{' '}
            {purchased
              ? '✨ 평생 소장 라이선스 보관함 시청 중'
              : '🔓 1차시 무료 오리엔테이션 재생 중'}
          </p>
        </div>

        {/* Global Progress Rate Bar */}
        <div className="bg-white p-3 rounded-xl border border-[#EFE8DC] w-full sm:w-64 space-y-1.5 self-stretch sm:self-auto shadow-sm">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-[#5F4E43]">전체 진도율</span>
            <span className="text-[#B65538] font-mono">{progressPercent}% 완료</span>
          </div>
          <div className="w-full bg-[#FAF4EA] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#B65538] h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[#5F4E43]/60">
            <span>완료 차시: {completedLessonIds.length}개</span>
            <span>총 수강 차시: {totalLessonsCount}개</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* WIDESCREEN 16:9 VIDEO PLAYER AREA */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative aspect-[16/9] bg-black rounded-2xl overflow-hidden shadow-xl border-2 border-white">
            {!currentLesson ? (
              <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
                등록된 차시가 없습니다.
              </div>
            ) : currentLocked ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-white/80">
                <Lock size={24} className="text-[#B65538]" />
                <p className="text-sm">평생소장 라이선스 구매 후 시청할 수 있는 차시입니다.</p>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white rounded-xl border border-[#EFE8DC] gap-4 shadow-sm">
              <div>
                <span className="text-[10px] font-bold text-[#B0863C] tracking-wide uppercase">
                  Lecture Playing
                </span>
                <h3 className="text-sm font-bold text-[#2A211B] mt-0.5">{currentLesson.title}</h3>
                <p className="text-xs text-[#5F4E43] mt-1">
                  {currentLesson.isPreview
                    ? '모든 수강생 무료 상시 공개 차시'
                    : '평생 소장 회원 전용 고난이도 빌딩 세션'}
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
                      : 'bg-[#FAF4EA] text-[#B65538] border border-[#EFE8DC] hover:bg-[#B65538] hover:text-white'
                  }`}
                >
                  <CheckCircle size={14} />
                  {completedLessonIds.includes(currentLesson.id) ? '완강 등록됨' : '차시 수강완료'}
                </button>

                <button
                  id="btn-download-materials"
                  onClick={handleDownloadPDF}
                  className="px-4 py-2 bg-[#2A211B] hover:bg-[#B0863C] text-[#FAF4EA] text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <FileDown size={14} />
                  PDF 배합표 받기
                </button>
              </div>
            </div>
          )}

          {/* Toast download trigger indicator */}
          {pdfDownloaded && (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-1 animate-fade-in">
              <span className="font-bold block text-[#B1863C]">
                📥 [아틀리에 크렘] 셰프 핵심 전수 노트 배합표 다운로드
              </span>
              <p className="font-normal opacity-90">
                『{cls.instructor} 셰프 전용 소수점 원본 계량 및 이중 도구 관리 수강 노트』 가 로컬
                디렉토리에 전송되었습니다. 정독 후 실습하여 주시기 바랍니다.
              </p>
            </div>
          )}

          {/* Notes summary for student */}
          <div className="bg-white p-6 rounded-2xl border border-[#EFE8DC] space-y-4">
            <h4 className="font-serif text-sm font-bold text-[#2A211B] border-b border-[#FAF4EA] pb-2">
              실습 핵심 요약 참고서
            </h4>
            <div className="text-xs text-[#5F4E43] space-y-3 leading-relaxed">
              <p>
                <strong className="text-[#B65538]">1. 오븐 습도 컨트롤:</strong> 머랭 건조 시 오븐
                내부 스팀 압축 벨브를 닫아서 강제 환풍해주는 단계가 필요합니다. 내부 대류 팬 속도는
                상도 60% 로 세팅하여 공기 순환이 안정적으로 유지되도록 보증하세요.
              </p>
              <p>
                <strong className="text-[#B0863C]">2. 계량 오차 범위의 축소:</strong> 설탕 당분을
                꼬끄 배합 시 무설탕 대체 당(알룰로스 등)으로 대량 대체할 경우 구조가 녹아 내리므로,
                프랑스식 비율에 맞춰 황금 백설탕을 권고 값 이하로 억제하지 않습니다.
              </p>
            </div>
          </div>
        </div>

        {/* SIDEBAR LESSON CHANGER */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#EFE8DC] p-5 space-y-4">
          <div className="border-b border-[#FAF4EA] pb-3">
            <h3 className="font-serif text-sm font-bold text-[#2A211B] flex items-center gap-1.5">
              <BookOpen size={16} className="text-[#B65538]" /> 온라인 스마트 비디오 목록
            </h3>
            <p className="text-[10px] text-[#5F4E43] mt-0.5">
              클릭하면 즉시 비디오 스트리밍이 변환됩니다.
            </p>
          </div>

          <div className="space-y-4 max-h-[300px] sm:max-h-[500px] overflow-y-auto pr-1">
            {chapters.map((chapter) => (
              <div key={chapter.index} className="space-y-2">
                <span className="text-[10.5px] font-bold text-[#B0863C] block uppercase tracking-wider bg-[#FAF4EA] p-1.5 rounded">
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
                            ? 'bg-[#B65538]/10 text-[#B65538] font-bold'
                            : locked
                              ? 'opacity-50 bg-[#FAF4EA]/30 text-[#5F4E43]/60 cursor-not-allowed'
                              : 'hover:bg-[#FAF4EA] text-[#2A211B]'
                        }`}
                      >
                        <div className="flex items-center gap-2 max-w-[85%]">
                          {isCompleted ? (
                            <span className="text-emerald-600 shrink-0">
                              <CheckCircle size={14} className="fill-emerald-100" />
                            </span>
                          ) : isSelected ? (
                            <span className="text-[#B65538] shrink-0 animate-bounce">
                              <PlayCircle size={14} />
                            </span>
                          ) : (
                            <span className="text-[#5F4E43]/40 shrink-0">•</span>
                          )}
                          <span className="truncate">{lesson.title}</span>
                        </div>

                        <div className="flex items-center gap-1 text-[9px] text-[#5F4E43]/60 font-mono">
                          {locked ? (
                            <span className="text-[8px] bg-[#B0863C]/10 text-[#B0863C] px-1 rounded">
                              잠김
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
            <div className="bg-[#B65538]/5 border border-[#B65538]/20 rounded-xl p-3 text-center space-y-2">
              <span className="text-[10.5px] font-bold text-[#B65538] block">
                🔒 나머지 고급 챕터가 미수금 상태입니다.
              </span>
              <p className="text-[9px] text-[#5F4E43] leading-normal font-light">
                평생무제한으로 셰프 전 오리지널 차시를 잠금해제하려면 수강 소장 프리패스를
                취득하십시오!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
