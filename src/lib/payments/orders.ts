import 'server-only';

import type { createAdminClient } from '@/lib/supabase/admin';
import type { Tables } from '../../../supabase/database.types';
import type { TossPayment } from './toss';

type AdminClient = ReturnType<typeof createAdminClient>;
export type OrderRow = Tables<'orders'>;

/**
 * PG 기준 누적 취소금액. Toss는 부분 취소를 반복하면 cancels 배열에 항목을 쌓으므로
 * 마지막 항목이 아니라 합계가 "지금까지 취소된 총액"이다(코드리뷰 H-3).
 * 취소 내역이 없으면 null → 호출부/RPC가 전액 취소로 간주한다.
 */
export function totalCanceledAmount(payment: TossPayment): number | null {
  const cancels = payment.cancels;
  if (!cancels || cancels.length === 0) return null;
  return cancels.reduce((sum, c) => sum + (c.cancelAmount ?? 0), 0);
}

/**
 * 승인 완료된 결제를 주문에 반영하고 수강권을 발급한다(멱등).
 * confirm 핸들러와 webhook이 공유 — 어느 쪽이 먼저 와도 결과는 동일하다.
 *
 * 쿠폰 사용 카운트는 여기서 올리지 않는다 — 한도를 원자적으로 강제하기 위해
 * 주문 생성 시점(open_pending_order)에 예약하고 취소 시 반환한다(코드리뷰 H-2).
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
  const { error: orderError } = await admin
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

  // 2) 영구 수강권 멱등 발급 (DB-F-01).
  //    grant_enrollment가 주문을 다시 잠그고 status='paid' + 인자 일치를 강제하므로,
  //    취소·환불된 주문을 든 stale 호출은 여기서 예외로 막힌다(코드리뷰 C-2).
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
  /** PG 기준 **누적** 취소 금액(KRW). null이면 전액 취소로 간주. */
  amountKrw?: number | null;
  /** 취소 시각(ISO). 미지정 시 now(). */
  canceledAt?: string | null;
}

/**
 * 결제 취소를 주문·수강권에 반영한다(멱등). 운영자 환불 라우트와 webhook이 공유한다.
 *
 * 실제 전이는 `refund_order` RPC가 수행한다 — 주문 행을 select ... for update로 잠그고
 * **현재** 상태를 기준으로 판정하므로, 호출자가 든 stale 상태로 잘못 전이하지 않는다(M-1).
 *
 * - 누적 취소금액 < 주문 금액이면 **부분 취소**: 금액·사유만 기록하고 수강권을 회수하지 않는다(H-3).
 * - 전액이면 결제된 주문은 'refunded', 미결제 주문은 'canceled'로 전이하고 수강권을
 *   'refunded'로 회수한다 → has_course_access(active만)가 영상·자료 접근을 차단한다.
 * - 이미 refunded/canceled면 no-op 성공(중복 웹훅·재클릭 안전).
 */
export async function refundOrder(
  admin: AdminClient,
  order: OrderRow,
  input: RefundInput,
): Promise<{ transitioned: boolean; partial: boolean }> {
  const { data, error } = await admin.rpc('refund_order', {
    p_order_id: order.id,
    p_reason: input.reason,
    p_cancel_key: input.cancelKey ?? undefined,
    p_total_canceled_krw: input.amountKrw ?? undefined,
    p_canceled_at: input.canceledAt ?? undefined,
  });
  if (error) {
    throw new Error(`주문 취소 처리 실패: ${error.message}`);
  }
  const result = data as { transitioned?: boolean; partial?: boolean } | null;
  return {
    transitioned: result?.transitioned ?? false,
    partial: result?.partial ?? false,
  };
}
