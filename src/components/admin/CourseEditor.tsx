'use client';

import { useAdminMutation } from '@/hooks/useAdminMutation';
import { Link } from '@/i18n/navigation';
import type { AdminCourseInfo, AdminLesson } from '@/types';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useCallback, useState } from 'react';
import CourseInfoForm from './CourseInfoForm';
import CurriculumBoard from './CurriculumBoard';
import ThumbnailPanel from './ThumbnailPanel';

/**
 * 클래스 통합 편집기 — 등록과 관리가 같은 화면이다.
 *
 * 예전에는 대시보드 모달에서 제목·가격만 받아 draft를 만들고, 커리큘럼은 다른 페이지에서
 * 차시를 하나씩 폼으로 만든 뒤 행마다 영상을 올려야 했다. 이제 "새 클래스 등록"이 곧바로
 * 이 화면으로 들어오고, 여기서 정보·커버·영상·챕터·참고서를 모두 끝낸다.
 *
 * 운영자 콘솔이라 문구는 한국어 리터럴이다(i18n 범위 밖 — CLAUDE.md).
 */
export default function CourseEditor({
  course,
  initialLessons,
}: {
  course: AdminCourseInfo;
  initialLessons: AdminLesson[];
}) {
  const lessons = initialLessons;
  const { busy, error, runMutation } = useAdminMutation();

  const [boardError, setBoardError] = useState<string | null>(null);
  // 보드가 effect에서 부르므로 신원이 고정돼야 한다(매 렌더 새 함수면 effect가 매번 돈다).
  const handleBoardError = useCallback((message: string) => setBoardError(message), []);

  const inboxCount = lessons.filter((l) => l.chapterIndex === 0).length;
  const missingVideo = lessons.filter((l) => !l.hasVideo).length;
  const published = course.status === 'published';

  const togglePublish = async () => {
    // 게시 전에 막지는 않는다 — 판단은 운영자 몫이고, 대신 무엇이 빠졌는지 보여준다.
    await runMutation(
      () =>
        fetch(`/api/admin/courses/${course.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: published ? 'draft' : 'published' }),
        }),
      { successMessage: published ? '초안으로 내렸습니다.' : '클래스를 공개했습니다.' },
    );
  };

  const blockers: string[] = [];
  if (!course.titleKo.trim() || course.titleKo === '제목 없는 클래스') {
    blockers.push('클래스 명칭이 아직 기본값입니다.');
  }
  if (!course.thumbnailUrl) blockers.push('커버 이미지가 없습니다.');
  if (course.priceKrw <= 0) blockers.push('판매가가 0원입니다.');
  if (lessons.length === 0) blockers.push('차시가 하나도 없습니다.');
  if (inboxCount > 0) blockers.push(`보관함에 배치되지 않은 영상이 ${inboxCount}개 있습니다.`);
  if (missingVideo > 0) blockers.push(`영상이 없는 차시가 ${missingVideo}개 있습니다.`);

  return (
    <div className="bg-cream py-10 px-4 sm:px-8 max-w-5xl mx-auto min-h-screen">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-xs font-semibold text-brown-medium hover:text-terracotta mb-4"
      >
        <ArrowLeft size={14} aria-hidden /> 대시보드로
      </Link>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <span className="text-xs font-bold text-gold-deep tracking-wider uppercase block">
            CLASS EDITOR
          </span>
          <h1 className="font-serif text-2xl font-bold text-brown">
            {course.titleKo || '(제목 없음)'}
          </h1>
          <p className="text-xs text-brown-medium mt-1">
            {published ? '공개 중' : '초안'} · 차시 {lessons.length}개
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={togglePublish}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
            published
              ? 'bg-cream border border-brown-light text-brown-medium hover:border-terracotta'
              : 'bg-terracotta text-white hover:bg-terracotta-deep'
          }`}
        >
          {published ? '초안으로 내리기' : '클래스 공개하기'}
        </button>
      </div>

      {(error || boardError) && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-xs font-semibold text-terracotta-deep space-y-1"
        >
          {/* 정보 저장 실패와 커리큘럼 저장 실패는 원인이 달라 하나로 덮으면 안 된다. */}
          {error && <p>{error}</p>}
          {boardError && <p>{boardError}</p>}
        </div>
      )}

      {!published && blockers.length > 0 && (
        <div className="mb-6 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3">
          <p className="inline-flex items-center gap-1 text-xs font-bold text-gold-deep mb-1">
            <AlertTriangle size={13} aria-hidden /> 공개 전에 확인하세요
          </p>
          <ul className="list-disc pl-5 text-[11px] text-brown-medium space-y-0.5">
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="bg-white rounded-2xl border border-brown-light shadow-sm p-6 mb-6">
        <h2 className="font-serif text-lg font-bold text-brown mb-4">클래스 정보</h2>
        <CourseInfoForm course={course} />
      </section>

      <section className="bg-white rounded-2xl border border-brown-light shadow-sm p-6 mb-6">
        <h2 className="font-serif text-lg font-bold text-brown mb-1">커버 이미지</h2>
        <p className="text-[11px] text-brown-medium/80 mb-4">
          온라인 클래스 목록과 상세 화면 상단에 그대로 쓰입니다. 가로형(16:9)을 권장합니다.
        </p>
        <ThumbnailPanel courseId={course.id} thumbnailUrl={course.thumbnailUrl} />
      </section>

      <section className="mb-6">
        <h2 className="font-serif text-lg font-bold text-brown mb-1">커리큘럼</h2>
        <p className="text-[11px] text-brown-medium/80 mb-4">
          영상을 올려 보관함에 쌓은 뒤 챕터로 끌어다 배치합니다. 각 차시에 실습 참고서(PDF)를
          붙일 수 있습니다.
        </p>
        <CurriculumBoard
          courseId={course.id}
          lessons={lessons}
          onError={handleBoardError}
        />
      </section>
    </div>
  );
}
