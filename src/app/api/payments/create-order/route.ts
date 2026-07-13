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

  // 판매 중인 코스의 서버 가격
  const { data: course } = await admin
    .from('courses')
    .select('id, title, price_krw')
    .eq('id', courseId)
    .eq('status', 'published')
    .single();
  if (!course) {
    return problem(404, 'course-not-found', 'Course not found', '판매 중인 클래스가 아닙니다.');
  }

  // 이미 활성 수강권 보유 시 결제 차단 (단건 구매, PRD-F-05)
  const { data: existing } = await admin
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .eq('status', 'active')
    .maybeSingle();
  if (existing) {
    return problem(409, 'already-enrolled', 'Already enrolled', '이미 보유 중인 클래스입니다.');
  }

  // 쿠폰 서버 산출 (표시용 검증과 동일 함수 → 단일 소스)
  let amount = course.price_krw;
  let discount = 0;
  let appliedCoupon: string | null = null;
  if (couponCode) {
    const { data: result, error } = await admin.rpc('validate_coupon', {
      p_code: couponCode,
      p_course_id: courseId,
    });
    const coupon = result as {
      valid: boolean;
      code?: string;
      discount_krw?: number;
      final_krw?: number;
    } | null;
    if (error || !coupon?.valid) {
      return problem(400, 'invalid-coupon', 'Invalid coupon', '유효하지 않은 쿠폰입니다.');
    }
    amount = coupon.final_krw ?? amount;
    discount = coupon.discount_krw ?? 0;
    appliedCoupon = coupon.code ?? null;
  }

  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      user_id: user.id,
      course_id: courseId,
      amount_krw: amount,
      coupon_code: appliedCoupon,
      discount_krw: discount,
      status: 'pending',
    })
    .select('id, amount_krw')
    .single();
  if (orderError || !order) {
    return problem(500, 'order-failed', 'Order creation failed', orderError?.message);
  }

  const title = (course.title as Record<string, string>)?.ko ?? 'Atelier Crème 클래스';
  return NextResponse.json({
    orderId: order.id,
    amount: order.amount_krw,
    orderName: title.slice(0, 100),
    customerEmail: user.email,
  });
}
