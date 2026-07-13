import 'server-only';

import type { createAdminClient } from '@/lib/supabase/admin';
import type { Tables } from '../../../supabase/database.types';
import type { TossPayment } from './toss';

type AdminClient = ReturnType<typeof createAdminClient>;
export type OrderRow = Tables<'orders'>;

/**
 * 승인 완료된 결제를 주문에 반영하고 수강권을 발급한다(멱등).
 * confirm 핸들러와 webhook이 공유 — 어느 쪽이 먼저 와도 결과는 동일하다.
 */
export async function completePaidOrder(
  admin: AdminClient,
  order: OrderRow,
  payment: TossPayment,
): Promise<{ enrollmentId: string }> {
  // 1) 주문 → paid 전이. 'failed'도 허용: confirm이 일시 장애로 failed 마킹한 뒤
  //    Toss가 실제 승인(DONE)이었음이 webhook으로 밝혀지는 복구 경로.
  //    .select()로 "이 호출이 실제로 전이시켰는지"를 원자적으로 판별한다 —
  //    confirm/webhook 동시 도착 시 한쪽만 전이자가 된다.
  const { data: transitionedRows, error: orderError } = await admin
    .from('orders')
    .update({
      status: 'paid',
      payment_key: payment.paymentKey,
      payment_method: payment.method ?? null,
      paid_at: payment.approvedAt ?? new Date().toISOString(),
    })
    .eq('id', order.id)
    .in('status', ['pending', 'failed'])
    .select('id');
  if (orderError) {
    throw new Error(`주문 상태 갱신 실패: ${orderError.message}`);
  }
  const didTransition = (transitionedRows?.length ?? 0) > 0;

  // 2) 쿠폰 사용 수 증가 — 실제 전이를 수행한 호출에서만 (스테일 읽기 기반 이중 증가 방지)
  if (order.coupon_code && didTransition) {
    const { error: couponError } = await admin.rpc('increment_coupon_redemption', {
      p_code: order.coupon_code,
    });
    if (couponError) {
      // 수강권 발급을 막을 사유는 아님 — 기록만 남긴다(정산 리포트에서 보정 가능)
      console.error(`쿠폰 사용수 증가 실패(${order.coupon_code}):`, couponError.message);
    }
  }

  // 3) 영구 수강권 멱등 발급 (DB-F-01)
  const { data: enrollmentId, error: grantError } = await admin.rpc('grant_enrollment', {
    p_order_id: order.id,
    p_user_id: order.user_id,
    p_course_id: order.course_id,
  });
  if (grantError || !enrollmentId) {
    throw new Error(`수강권 발급 실패: ${grantError?.message ?? 'unknown'}`);
  }
  return { enrollmentId };
}
