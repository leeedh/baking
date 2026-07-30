import DetailScreen from '@/components/DetailScreen';
import { getCourseDetail } from '@/lib/catalog';
import { hasEnrollmentBySlug } from '@/lib/enrollments';
import { getLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

// 세션 쿠키로 수강권을 판별하므로 요청마다 동적 렌더.
export const dynamic = 'force-dynamic';

// ⚠️ 이 세그먼트에는 loading.tsx를 두지 말 것.
// loading.tsx는 Suspense 셸을 즉시 flush하고, 헤더가 나간 뒤에는 상태 코드를 바꿀 수 없어
// 아래 notFound()가 HTTP 200으로 나간다(브랜드 404 화면은 보이지만 soft-404).
// 공개·색인 대상 경로라 스켈레톤보다 정확한 404를 우선한다. 근거: Docs/UXGuide.md §8.6

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();

  const [detail, purchased] = await Promise.all([
    getCourseDetail(id, locale),
    hasEnrollmentBySlug(id),
  ]);

  // 미게시(course_catalog에서 제외)·존재하지 않는 slug → 404.
  if (!detail) notFound();

  return (
    <DetailScreen
      course={detail.course}
      chapters={detail.chapters}
      reviews={detail.reviews}
      canReview={detail.canReview}
      myReview={detail.myReview}
      courseId={detail.courseId}
      purchased={purchased}
    />
  );
}
