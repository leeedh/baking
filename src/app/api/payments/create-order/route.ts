import { assertSameOrigin } from '@/lib/api/origin';
import { problem } from '@/lib/api/problem';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// TS-API-10 선행 단계: 서버가 금액을 산출한 pending 주문을 만든다.
// 클라이언트가 보낸 금액은 어디에도 쓰지 않는다(TS-ADR-08).
const BodySchema = z.object({
  // z.uuid()는 RFC-4122 버전 비트까지 강제해 시드의 고정 UUID(11111111-...)를 거부한다.
  // Postgres uuid 의미론(8-4-4-4-12 hex)에는 z.guid()가 정합.
  courseId: z.guid(),
  couponCode: z.string().trim().min(1).max(64).optional(),
});

export async function POST(request: Request) {
  const denied = assertSameOrigin(request);
  if (denied) return denied;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return problem(401, 'unauthorized', 'Login required', '로그인 후 결제할 수 있습니다.');
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'invalid-request', 'Invalid request body', parsed.error.message);
  }
  const { courseId, couponCode } = parsed.data;

  const admin = createAdminClient();

  // 가격 산출·수강권 확인·쿠폰 예약·주문 생성을 하나의 DB 트랜잭션에서 처리한다.
  // 앱에서 나눠 하던 시절엔 두 탭 동시 결제로 pending 주문이 공존해 이중 청구가 가능했고
  // (코드리뷰 H-1) 쿠폰 한도도 결제 시점에 보장되지 않았다(H-2).
  // orders(user_id, course_id) partial unique index가 최종 방어선이다.
  const { data, error } = await admin.rpc('open_pending_order', {
    p_user_id: user.id,
    p_course_id: courseId,
    p_coupon_code: couponCode,
  });
  if (error) {
    return problem(500, 'order-failed', 'Order creation failed', error.message);
  }

  const result = data as {
    ok: boolean;
    reason?: string;
    order_id?: string;
    amount_krw?: number;
    course_title?: Record<string, string> | null;
  } | null;

  if (!result?.ok) {
    switch (result?.reason) {
      case 'course_not_found':
        return problem(404, 'course-not-found', 'Course not found', '판매 중인 클래스가 아닙니다.');
      case 'already_enrolled':
        return problem(409, 'already-enrolled', 'Already enrolled', '이미 보유 중인 클래스입니다.');
      case 'already_paid':
        return problem(
          409,
          'already-paid',
          'Order already paid',
          '이미 결제가 완료된 클래스입니다. 잠시 후 보관함에서 확인해 주세요.',
        );
      case 'confirm_in_progress':
        // 승인 진행 중인 주문은 건드리지 않는다 — 금액을 바꾸거나 새 주문을 만들면
        // capture 결과와 DB가 어긋난다.
        return problem(
          409,
          'confirm-in-progress',
          'Confirmation in progress',
          '이 클래스의 결제 승인이 진행 중입니다. 잠시 후 보관함에서 확인해 주세요.',
        );
      case 'invalid_coupon':
        return problem(400, 'invalid-coupon', 'Invalid coupon', '유효하지 않은 쿠폰입니다.');
      default:
        return problem(500, 'order-failed', 'Order creation failed', '주문을 생성하지 못했습니다.');
    }
  }

  const title = result.course_title?.ko ?? 'Atelier Crème 클래스';
  return NextResponse.json({
    orderId: result.order_id,
    amount: result.amount_krw,
    orderName: title.slice(0, 100),
    customerEmail: user.email,
  });
}
