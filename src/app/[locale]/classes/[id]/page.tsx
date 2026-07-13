import DetailScreen from '@/components/DetailScreen';
import { hasEnrollmentBySlug } from '@/lib/enrollments';

// 세션 쿠키로 수강권을 판별하므로 요청마다 동적 렌더.
export const dynamic = 'force-dynamic';

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const purchased = await hasEnrollmentBySlug(id);
  return <DetailScreen classId={id} purchased={purchased} />;
}
