import PaymentScreen from '@/components/PaymentScreen';
import { getCourseSummary } from '@/lib/catalog';
import { getUser } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';

// 세션 쿠키 가드 + 코스 실데이터 조회이므로 요청마다 동적 렌더.
export const dynamic = 'force-dynamic';

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const user = await getUser();
  if (!user) redirect(`/${locale}/login`);

  // 판매 중이 아닌 slug는 404 — 다른 클래스로 대체하지 않는다(엉뚱한 상품 결제 방지).
  const summary = await getCourseSummary(id, locale);
  if (!summary) notFound();

  return <PaymentScreen classId={id} course={summary.course} courseId={summary.courseId} />;
}
