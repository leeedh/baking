import { problem } from '@/lib/api/problem';
import { completePaidOrder, refundOrder } from '@/lib/payments/orders';
import { totalCanceledAmount } from '@/lib/payments/policy';
import { getTossPayment } from '@/lib/payments/toss';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// TS-API-11 · TossPayments Webhook (가상계좌 등 비동기 결제 보완).
// 무결성: 페이로드를 신뢰하지 않고 paymentKey로 Toss API를 재조회해 원본 상태를
// 확인한다(시크릿 키 인증 = 서명 검증과 동등한 신뢰 경로). 멱등: 주문 상태 전이
// 가드 + grant_enrollment(order_id UNIQUE)로 중복 수신에 안전.
const PayloadSchema = z.object({
  eventType: z.string().optional(),
  data: z
    .object({ paymentKey: z.string().optional(), orderId: z.string().optional() })
    .passthrough()
    .optional(),
  // v1 스타일(평면) 페이로드 호환
  paymentKey: z.string().optional(),
  orderId: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = PayloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'invalid-webhook', 'Invalid webhook payload');
  }
  const paymentKey = parsed.data.data?.paymentKey ?? parsed.data.paymentKey;
  const orderId = parsed.data.data?.orderId ?? parsed.data.orderId;
  if (!paymentKey || !orderId) {
    // 결제 이벤트가 아닌 웹훅(정산 등)은 무시
    return NextResponse.json({ ok: true, ignored: true });
  }

  // 원본 재조회 — 위조된 페이로드는 여기서 걸러진다
  const result = await getTossPayment(paymentKey);
  if (!result.ok) {
    return problem(400, 'payment-not-found', 'Unknown paymentKey');
  }
  const payment = result.payment;
  if (payment.orderId !== orderId) {
    return problem(400, 'order-mismatch', 'orderId does not match payment');
  }

  const admin = createAdminClient();
  const { data: order } = await admin.from('orders').select('*').eq('id', orderId).single();
  if (!order) {
    return problem(404, 'order-not-found', 'Order not found');
  }

  if (payment.status === 'DONE') {
    // 금액 재검증 후 완결 (confirm과 동일 경로, 멱등)
    if (payment.totalAmount !== order.amount_krw) {
      return problem(400, 'amount-mismatch', 'Amount mismatch');
    }
    // 'confirming'(confirm이 선점한 뒤 5xx/타임아웃으로 끊긴 경우)과 'failed'(confirm이
    // 일시 장애로 마킹했지만 Toss는 승인이었던 경우)도 완결 대상 — 승인됐는데 미발급을 막는다.
    if (
      order.status === 'pending' ||
      order.status === 'confirming' ||
      order.status === 'failed'
    ) {
      await completePaidOrder(admin, order.id, payment);
    }
  } else if (payment.status === 'CANCELED' || payment.status === 'PARTIAL_CANCELED') {
    // 환불 흐름(DC-34/35): 운영자 취소 액션과 동일한 공유 헬퍼로 처리(멱등).
    // 누적 취소금액을 넘겨 부분 취소와 전액 취소를 구분한다 — 부분 취소는 수강권을
    // 회수하지 않는다(코드리뷰 H-3). 전액이어야 'refunded'/'canceled'로 전이한다.
    const latestCancel = payment.cancels?.[payment.cancels.length - 1];
    await refundOrder(admin, order, {
      reason: 'PG webhook 취소 통보',
      cancelKey: latestCancel?.transactionKey ?? null,
      amountKrw: totalCanceledAmount(payment),
    });
  } else if (payment.status === 'ABORTED' || payment.status === 'EXPIRED') {
    // 결제창 이탈·만료 — 다시 살아날 여지가 없으므로 취소로 확정하고 쿠폰 재고를 반환한다.
    await admin.rpc('close_unpaid_order', {
      p_order_id: order.id,
      p_status: 'canceled',
      p_reason: `PG ${payment.status}`,
    });
  } else {
    // READY/IN_PROGRESS/WAITING_FOR_DEPOSIT 등 중간 상태는 조치 없음.
    // 다만 조용히 넘기지 않고 기록한다 — 여기서 침묵하면 Toss가 성공으로 간주해
    // 재전송하지 않으므로 주문이 pending에 정체된 사실을 알 길이 없어진다.
    console.warn(`[webhook-no-action] status=${payment.status} order=${order.id}`);
  }

  return NextResponse.json({ ok: true });
}
