-- =============================================================================
-- DB-MIG-06 · 결제(EPIC-D) 지원: 쿠폰 서버 검증 RPC + 주문 쿠폰 추적 컬럼
--
-- TS-ADR-08: 최종 결제 금액은 반드시 서버가 계산·검증한다. 클라이언트 표시용
-- 검증과 서버 확정 검증이 같은 함수(validate_coupon)를 쓰도록 단일화한다.
-- coupons 테이블은 일반 SELECT 정책이 없으므로(코드 열거 방지) SECURITY DEFINER로
-- "특정 코드 1건"의 유효성만 조회하게 한다.
-- =============================================================================

-- 주문에 적용된 쿠폰 추적 (DBSchema DB-T-09 비고: 정산·환불 정합)
alter table public.orders
  add column if not exists coupon_code  text,
  add column if not exists discount_krw integer not null default 0 check (discount_krw >= 0);

-- 쿠폰 유효성·할인액 서버 산출
create or replace function public.validate_coupon(p_code text, p_course_id uuid)
returns jsonb language plpgsql security definer set search_path = public stable
as $$
declare
  v_coupon   public.coupons%rowtype;
  v_price    integer;
  v_discount integer;
begin
  select price_krw into v_price
    from public.courses where id = p_course_id and status = 'published';
  if v_price is null then
    return jsonb_build_object('valid', false, 'reason', 'course_not_found');
  end if;

  select * into v_coupon from public.coupons where code = upper(trim(p_code));
  if v_coupon.code is null or not v_coupon.is_active then
    return jsonb_build_object('valid', false, 'reason', 'invalid_code');
  end if;
  if v_coupon.starts_at is not null and v_coupon.starts_at > now() then
    return jsonb_build_object('valid', false, 'reason', 'not_started');
  end if;
  if v_coupon.expires_at is not null and v_coupon.expires_at <= now() then
    return jsonb_build_object('valid', false, 'reason', 'expired');
  end if;
  if v_coupon.max_redemptions is not null and v_coupon.redeemed_count >= v_coupon.max_redemptions then
    return jsonb_build_object('valid', false, 'reason', 'exhausted');
  end if;

  if v_coupon.discount_type = 'percent' then
    v_discount := floor(v_price * v_coupon.discount_value / 100.0)::integer;
  else
    v_discount := v_coupon.discount_value;
  end if;
  v_discount := least(v_discount, v_price);  -- 음수 결제 방지

  return jsonb_build_object(
    'valid', true,
    'code', v_coupon.code,
    'discount_krw', v_discount,
    'final_krw', v_price - v_discount
  );
end; $$;

-- 로그인 사용자만 특정 코드 검증 가능(열거 방지: 목록 조회는 여전히 불가)
revoke execute on function public.validate_coupon(text, uuid) from public, anon;
grant  execute on function public.validate_coupon(text, uuid) to authenticated, service_role;
