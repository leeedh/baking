import { problem } from '@/lib/api/problem';
import { completePaidOrder } from '@/lib/payments/orders';
import { confirmTossPayment } from '@/lib/payments/toss';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// TS-API-10 · 결제 승인 서버 검증: 금액·주문 소유·상태를 DB 기준으로 재검증한 뒤
// Toss 승인 API를 호출하고, 성공 시 멱등 수강권 발급(grant_enrollment).
const BodySchema = z.object({
  paymentKey: z.string().min(1),
  orderId: z.guid(), // Postgres uuid 정합 (z.uuid()는 버전 비트 강제 — create-order 참조)
  amount: z.number().int().nonnegative(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return problem(401, 'unauthorized', 'Login required', '로그인이 필요합니다.');
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'invalid-request', 'Invalid request body', parsed.error.message);
  }
  const { paymentKey, orderId, amount } = parsed.data;

  const admin = createAdminClient();
  const { data: order } = await admin.from('orders').select('*').eq('id', orderId).single();
  if (!order || order.user_id !== user.id) {
    return problem(404, 'order-not-found', 'Order not found', '주문을 찾을 수 없습니다.');
  }

  // 이미 확정된 주문 → 멱등 성공 (webhook이 먼저 처리했거나 재시도)
  if (order.status === 'paid') {
    return NextResponse.json({ ok: true, courseId: order.course_id });
  }
  if (order.status !== 'pending') {
    return problem(409, 'order-invalid-state', 'Order not payable', `주문 상태: ${order.status}`);
  }

  // 금액 위·변조 방어: 클라이언트 금액이 아니라 주문의 서버 산출 금액과 대조
  if (amount !== order.amount_krw) {
    return problem(
      400,
      'amount-mismatch',
      'Amount mismatch',
      '결제 금액이 주문 금액과 일치하지 않습니다.',
    );
  }

  // 이중 청구 방어: 다른 주문(두 탭 동시 결제 등)으로 이미 수강권이 발급됐다면
  // Toss confirm(=캡처)을 호출하지 않는다 — 미승인 인증은 만료되어 청구되지 않는다.
  // create-order의 사전 체크는 두 pending 주문이 공존하는 경합을 막지 못한다.
  const { data: existingEnrollment } = await admin
    .from('enrollments')
    .select('id')
    .eq('user_id', order.user_id)
    .eq('course_id', order.course_id)
    .eq('status', 'active')
    .maybeSingle();
  if (existingEnrollment) {
    await admin
      .from('orders')
      .update({ status: 'canceled' })
      .eq('id', orderId)
      .eq('status', 'pending');
    return problem(
      409,
      'already-enrolled',
      'Already enrolled',
      '이미 보유 중인 클래스입니다. 이 주문은 청구되지 않았습니다.',
    );
  }

  const result = await confirmTossPayment(paymentKey, orderId, order.amount_krw);
  if (!result.ok) {
    // 확정적 거절(4xx)만 failed 마킹. 5xx/타임아웃은 Toss가 실제로 승인했을 수도 있으므로
    // pending을 유지해 webhook(DONE) 완결·재시도 경로를 열어 둔다(승인됐는데 미발급 방지).
    if (result.status >= 400 && result.status < 500) {
      await admin
        .from('orders')
        .update({ status: 'failed' })
        .eq('id', orderId)
        .eq('status', 'pending');
    }
    return problem(
      result.status >= 400 && result.status < 500 ? 400 : 502,
      'toss-confirm-failed',
      'Payment confirmation failed',
      `${result.error.code}: ${result.error.message}`,
    );
  }
  if (result.payment.status !== 'DONE') {
    // 가상계좌 등 비동기 수단은 webhook(TS-API-11)에서 완결
    return NextResponse.json({ ok: false, pending: true, status: result.payment.status });
  }

  try {
    await completePaidOrder(admin, order, result.payment);
  } catch (e) {
    // 승인은 됐으나 발급 실패 — webhook 재시도로 복구 가능, 오류는 노출
    return problem(500, 'grant-failed', 'Enrollment grant failed', (e as Error).message);
  }
  return NextResponse.json({ ok: true, courseId: order.course_id });
}
