import { problem } from '@/lib/api/problem';
import { completePaidOrder } from '@/lib/payments/orders';
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
    // 'failed'도 완결 대상: confirm이 일시 장애로 failed 마킹했지만
    // Toss는 승인(DONE)이었던 경우의 복구 경로(승인됐는데 미발급 방지).
    if (order.status === 'pending' || order.status === 'failed') {
      await completePaidOrder(admin, order, payment);
    }
  } else if (payment.status === 'CANCELED' || payment.status === 'PARTIAL_CANCELED') {
    // 환불 흐름(EPIC-H)의 기초: 결제 후 취소만 'refunded', 미결제 취소는 'canceled'.
    const wasPaid = order.status === 'paid';
    await admin
      .from('orders')
      .update({ status: wasPaid ? 'refunded' : 'canceled' })
      .eq('id', order.id);
    await admin.from('enrollments').update({ status: 'refunded' }).eq('order_id', order.id);
  } else if (payment.status === 'ABORTED' || payment.status === 'EXPIRED') {
    await admin
      .from('orders')
      .update({ status: 'failed' })
      .eq('id', order.id)
      .eq('status', 'pending');
  }
  // READY/IN_PROGRESS/WAITING_FOR_DEPOSIT 등 중간 상태는 조치 없음

  return NextResponse.json({ ok: true });
}
