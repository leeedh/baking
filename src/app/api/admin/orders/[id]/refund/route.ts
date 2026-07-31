import { assertSameOrigin } from '@/lib/api/origin';
import { problem } from '@/lib/api/problem';
import { requireAdmin } from '@/lib/auth/require-admin';
import { refundOrder } from '@/lib/payments/orders';
import { totalCanceledAmount } from '@/lib/payments/policy';
import { cancelTossPayment } from '@/lib/payments/toss';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// DC-34 · 운영자 환불. PG 취소(Toss) → 주문/수강권 refunded 전이(공유 refundOrder).
// 이중 방어: assertSameOrigin(CSRF) → requireAdmin(role). service_role은 RLS를 우회하므로
// 앱 계층 role 확인이 필수다. 환불 후 has_course_access(active만)가 재생·자료 접근을 차단한다.

// 이미 취소된 결제에 Toss가 돌려주는 코드 — 재요청을 멱등 성공으로 해석한다.
const ALREADY_CANCELED_CODES = new Set(['ALREADY_CANCELED_PAYMENT', 'ALREADY_PROCESSED_PAYMENT']);

const BodySchema = z.object({
  reason: z.string().trim().min(1).max(200).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const crossOrigin = assertSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!z.guid().safeParse(id).success) {
    return problem(400, 'invalid-request', 'Invalid order id', '잘못된 주문 ID입니다.');
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return problem(400, 'invalid-request', 'Invalid body', parsed.error.message);
  }
  const reason = parsed.data.reason ?? '운영자 환불';

  const admin = createAdminClient();
  const { data: order } = await admin.from('orders').select('*').eq('id', id).maybeSingle();
  if (!order) {
    return problem(404, 'order-not-found', 'Order not found', '주문을 찾을 수 없습니다.');
  }

  // 이미 환불된 주문은 멱등 성공(재클릭 안전).
  if (order.status === 'refunded' || order.status === 'canceled') {
    return NextResponse.json({ id: order.id, status: order.status, alreadyRefunded: true });
  }
  if (order.status !== 'paid') {
    return problem(
      409,
      'not-refundable',
      'Order not refundable',
      '결제 완료된 주문만 환불할 수 있습니다.',
    );
  }
  if (!order.payment_key) {
    return problem(
      409,
      'no-payment-key',
      'No payment key',
      '결제 식별자가 없어 PG 취소를 진행할 수 없습니다.',
    );
  }

  // PG 취소(전액). 이미 취소된 결제는 멱등 성공으로 처리하고 DB 전이를 계속 진행한다.
  const result = await cancelTossPayment(order.payment_key, reason);
  let cancelKey: string | null = null;
  let cancelAmount: number | null = null;
  if (!result.ok) {
    if (!ALREADY_CANCELED_CODES.has(result.error.code)) {
      const status = result.status >= 500 ? 502 : 409;
      return problem(status, 'pg-cancel-failed', 'PG cancel failed', result.error.message);
    }
    // 이미 취소됨 — DB만 정합화한다.
  } else {
    // 2xx라도 실제 취소 상태가 아니면(예상 밖 응답) DB를 전이하지 않는다 —
    // "돈 미반환 + 접근만 회수" 오작동 방지.
    const p = result.payment;
    if (p.status !== 'CANCELED' && p.status !== 'PARTIAL_CANCELED') {
      return problem(
        502,
        'pg-cancel-unconfirmed',
        'PG cancel not reflected',
        'PG에서 취소가 확인되지 않았습니다. 잠시 후 다시 시도해 주세요.',
      );
    }
    const latest = p.cancels?.[p.cancels.length - 1];
    cancelKey = latest?.transactionKey ?? null;
    // 마지막 취소 건이 아니라 누적 취소금액을 넘긴다 — refundOrder가 이 값으로
    // 부분/전액을 판정한다(코드리뷰 H-3).
    cancelAmount = totalCanceledAmount(p);
  }

  await refundOrder(admin, order, { reason, cancelKey, amountKrw: cancelAmount });

  return NextResponse.json({ id: order.id, status: 'refunded' });
}
