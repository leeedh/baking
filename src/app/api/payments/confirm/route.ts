import { assertSameOrigin } from '@/lib/api/origin';
import { problem } from '@/lib/api/problem';
import { completePaidOrder } from '@/lib/payments/orders';
import { shouldMarkOrderFailed } from '@/lib/payments/policy';
import { confirmTossPayment } from '@/lib/payments/toss';
import { getTossFailureMessage } from '@/lib/payments/toss-error-messages';
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
  const denied = assertSameOrigin(request);
  if (denied) return denied;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return problem(401, 'unauthorized', 'Login required', '로그인이 필요합니다.');
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'invalid-request', 'Invalid request body', '요청 형식이 올바르지 않습니다.');
  }
  const { paymentKey, orderId, amount } = parsed.data;

  const admin = createAdminClient();

  // capture 선점: 주문 행을 잠근 채 소유자·상태·금액·수강권을 한 번에 재확인하고
  // 'confirming'으로 전이시킨다. 읽기와 capture 사이에 다른 탭의 체크아웃이 금액을
  // 바꾸거나(P1) 같은 강좌를 동시에 승인하는(H-1) 경합을 여기서 차단한다.
  // 선점에 성공한 요청만 아래에서 Toss를 호출한다.
  const { data: claimData, error: claimError } = await admin.rpc('claim_order_for_confirm', {
    p_order_id: orderId,
    p_user_id: user.id,
    p_amount_krw: amount,
  });
  if (claimError) {
    return problem(500, 'claim-failed', 'Order claim failed', claimError.message);
  }
  const claim = claimData as {
    ok: boolean;
    reason?: string;
    status?: string;
    course_id?: string;
  } | null;

  if (!claim?.ok) {
    switch (claim?.reason) {
      case 'already_paid':
        // 멱등 성공 — webhook이 먼저 처리했거나 사용자가 재시도한 경우
        return NextResponse.json({ ok: true, courseId: claim.course_id });
      case 'not_found':
        return problem(404, 'order-not-found', 'Order not found', '주문을 찾을 수 없습니다.');
      case 'amount_mismatch':
        return problem(
          400,
          'amount-mismatch',
          'Amount mismatch',
          '결제 금액이 주문 금액과 일치하지 않습니다. 결제 화면을 새로 열어 주세요.',
        );
      case 'already_enrolled':
        await admin.rpc('close_unpaid_order', {
          p_order_id: orderId,
          p_status: 'canceled',
          p_reason: '이미 보유 중인 클래스',
        });
        return problem(
          409,
          'already-enrolled',
          'Already enrolled',
          '이미 보유 중인 클래스입니다. 이 주문은 청구되지 않았습니다.',
        );
      case 'already_in_progress':
        return problem(
          409,
          'order-in-progress',
          'Another confirmation in progress',
          '같은 클래스의 다른 결제가 진행 중입니다. 잠시 후 보관함에서 확인해 주세요.',
        );
      default:
        return problem(
          409,
          'order-invalid-state',
          'Order not payable',
          `주문 상태: ${claim?.status ?? 'unknown'}`,
        );
    }
  }

  const result = await confirmTossPayment(paymentKey, orderId, amount);
  if (!result.ok) {
    // 확정적 거절(4xx)만 failed 마킹 — 쿠폰 예약도 이때 즉시 반환된다(P2).
    // 5xx/타임아웃은 Toss가 실제로 승인했을 수도 있으므로 'confirming'을 유지해
    // webhook(DONE) 완결 경로를 열어 둔다(승인됐는데 미발급 방지).
    if (shouldMarkOrderFailed(result.status)) {
      await admin.rpc('close_unpaid_order', {
        p_order_id: orderId,
        p_status: 'failed',
        p_reason: result.error.code,
      });
    }
    console.error(`[toss-confirm-failed] ${result.error.code}: ${result.error.message}`);
    return problem(
      shouldMarkOrderFailed(result.status) ? 400 : 502,
      'toss-confirm-failed',
      'Payment confirmation failed',
      getTossFailureMessage(result.error.code, result.error.message),
    );
  }
  if (result.payment.status !== 'DONE') {
    // 가상계좌 등 비동기 수단은 webhook(TS-API-11)에서 완결
    return NextResponse.json({ ok: false, pending: true, status: result.payment.status });
  }

  try {
    await completePaidOrder(admin, orderId, result.payment);
  } catch (e) {
    // 승인은 됐으나 발급 실패 — webhook 재시도로 복구 가능, 오류는 노출
    return problem(500, 'grant-failed', 'Enrollment grant failed', (e as Error).message);
  }
  return NextResponse.json({ ok: true, courseId: claim.course_id });
}
