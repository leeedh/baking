import PlayerScreen from '@/components/PlayerScreen';
import { hasEnrollmentBySlug } from '@/lib/enrollments';

// 세션 쿠키로 수강권을 판별하므로 요청마다 동적 렌더.
// 비로그인도 접근 가능(무료 미리보기 차시) — 잠금은 purchased 기준.
export const dynamic = 'force-dynamic';

export default async function LearnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const purchased = await hasEnrollmentBySlug(id);
  return <PlayerScreen classId={id} purchased={purchased} />;
}
