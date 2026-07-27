import PlayerScreen from '@/components/PlayerScreen';
import { getCourseSummary } from '@/lib/catalog';
import { getLearnPageData } from '@/lib/lessons';
import { getLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

// 세션 쿠키로 수강권을 판별하므로 요청마다 동적 렌더.
// 비로그인도 접근 가능(무료 미리보기 차시) — 잠금은 purchased 기준.
export const dynamic = 'force-dynamic';

export default async function LearnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();

  // 코스 메타(제목·강사)와 학습 데이터를 병렬 조회 — 둘 다 같은 slug 기준.
  const [summary, { purchased, chapters, progress, watermarkLabel, materials }] = await Promise.all([
    getCourseSummary(id, locale),
    getLearnPageData(id, locale),
  ]);

  // 판매 중이 아닌 slug는 404 — 목업 폴백 없음.
  if (!summary) notFound();

  return (
    <PlayerScreen
      classId={id}
      courseTitle={summary.course.title}
      instructorName={summary.course.instructor}
      purchased={purchased}
      chapters={chapters}
      progress={progress}
      watermarkLabel={watermarkLabel}
      materials={materials}
    />
  );
}
