import DetailScreen from '@/components/DetailScreen';
import { getCourseDetail } from '@/lib/catalog';
import { hasEnrollmentBySlug } from '@/lib/enrollments';
import { getLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

// 세션 쿠키로 수강권을 판별하므로 요청마다 동적 렌더.
export const dynamic = 'force-dynamic';

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
      purchased={purchased}
    />
  );
}
