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

export interface RefundInput {
  /** 취소 사유(운영자 입력 또는 Toss 통보). */
  reason: string;
  /** Toss 취소 트랜잭션 식별자(있으면 이력에 기록). */
  cancelKey?: string | null;
  /** 취소 금액(KRW). 전액 취소 시 주문 금액과 동일. */
  amountKrw?: number | null;
  /** 취소 시각(ISO). 미지정 시 now(). */
  canceledAt?: string | null;
}

/**
 * 결제 취소를 주문·수강권에 반영한다(멱등). 운영자 환불 라우트와 webhook이 공유한다.
 *
 * - 결제된 주문(paid)만 'refunded'로, 미결제 주문은 'canceled'로 전이한다.
 *   `.in('status', ...)` 가드 + `.select()`로 실제 전이자를 원자적으로 판별해
 *   webhook·운영자 액션 동시 도착 시 이중 처리를 막는다.
 * - 수강권은 하드 삭제하지 않고 'refunded'로 전이 → has_course_access(active만)가
 *   자동으로 false를 반환해 영상·자료 접근이 차단된다.
 * - 이미 refunded/canceled면 no-op 성공(중복 웹훅·재클릭 안전).
 */
export async function refundOrder(
  admin: AdminClient,
  order: OrderRow,
  input: RefundInput,
): Promise<{ transitioned: boolean }> {
  const nextStatus = order.status === 'paid' ? 'refunded' : 'canceled';

  const { data: transitionedRows, error: orderError } = await admin
    .from('orders')
    .update({
      status: nextStatus,
      canceled_at: input.canceledAt ?? new Date().toISOString(),
      cancel_reason: input.reason,
      cancel_amount_krw: input.amountKrw ?? order.amount_krw,
      cancel_key: input.cancelKey ?? null,
    })
    .eq('id', order.id)
    .in('status', ['paid', 'pending', 'failed'])
    .select('id');
  if (orderError) {
    throw new Error(`주문 취소 상태 갱신 실패: ${orderError.message}`);
  }
  const transitioned = (transitionedRows?.length ?? 0) > 0;

  // 수강권 회수 — order_id로 발급된 수강권을 refunded로. (미발급이면 0행, 안전)
  const { error: enrollError } = await admin
    .from('enrollments')
    .update({ status: 'refunded' })
    .eq('order_id', order.id);
  if (enrollError) {
    throw new Error(`수강권 회수 실패: ${enrollError.message}`);
  }

  return { transitioned };
}
