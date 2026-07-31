-- =============================================================================
-- DB-MIG-08 · 코드리뷰 C-2 · H-1 · H-2 · H-3 · M-1
-- 결제·수강권 불변식을 앱 코드의 실행 순서가 아니라 DB 제약·함수가 강제하게 한다.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- H-1 · 단건 구매를 DB가 강제 — 같은 (사용자, 강좌)로 살아 있는 주문은 최대 1건.
-- 두 탭 동시 결제로 pending 주문이 공존하고 둘 다 승인되던 이중 청구를 원천 차단한다.
-- -----------------------------------------------------------------------------
create unique index if not exists orders_user_course_open_uk
  on public.orders (user_id, course_id)
  where status in ('pending', 'paid');

-- -----------------------------------------------------------------------------
-- H-2 · 쿠폰 사용 예약/반환 — 한도 검사와 카운트 증가를 같은 트랜잭션에 둔다.
-- 기존 increment_coupon_redemption은 결제 완료 시점에 호출돼 초과 판매를 막지 못했고
-- 반환값도 없어 실패를 알 수 없었다. 예약을 주문 생성 시점으로 옮긴다.
-- -----------------------------------------------------------------------------
create or replace function public.reserve_coupon(p_code text)
returns boolean language sql security definer set search_path = public
as $$
  with updated as (
    update public.coupons
       set redeemed_count = redeemed_count + 1
     where code = upper(trim(p_code))
       and is_active
       and (max_redemptions is null or redeemed_count < max_redemptions)
    returning 1
  )
  select exists (select 1 from updated);
$$;

create or replace function public.release_coupon(p_code text)
returns void language sql security definer set search_path = public
as $$
  update public.coupons
     set redeemed_count = greatest(redeemed_count - 1, 0)
   where code = upper(trim(p_code));
$$;

revoke execute on function public.reserve_coupon(text) from public, anon, authenticated;
revoke execute on function public.release_coupon(text) from public, anon, authenticated;
grant execute on function public.reserve_coupon(text)  to service_role;
grant execute on function public.release_coupon(text)  to service_role;

-- -----------------------------------------------------------------------------
-- H-1/H-2 · 주문 생성 원자화. 유니크 인덱스만 두면 정상 재시도 사용자가 충돌하므로,
-- "기존 pending 정리 → 쿠폰 예약 → 주문 생성"을 한 트랜잭션으로 묶는다.
-- 금액은 전적으로 서버가 산출한다(TS-ADR-08) — 클라이언트 금액은 인자로 받지 않는다.
-- -----------------------------------------------------------------------------
create or replace function public.open_pending_order(
  p_user_id uuid, p_course_id uuid, p_coupon_code text default null
) returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_course   public.courses%rowtype;
  v_stale    public.orders%rowtype;
  v_coupon   jsonb;
  v_amount   integer;
  v_discount integer := 0;
  v_code     text := null;
  v_order_id uuid;
begin
  select * into v_course
    from public.courses where id = p_course_id and status = 'published';
  if v_course.id is null then
    return jsonb_build_object('ok', false, 'reason', 'course_not_found');
  end if;

  -- 이미 수강권을 가진 강좌는 재구매 불가(PRD-F-05 단건 구매)
  if exists (
    select 1 from public.enrollments
     where user_id = p_user_id and course_id = p_course_id and status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_enrolled');
  end if;

  -- 결제 완료 주문이 살아 있으면 새 주문을 열지 않는다(유니크 인덱스와 동일한 판정).
  if exists (
    select 1 from public.orders
     where user_id = p_user_id and course_id = p_course_id and status = 'paid'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_paid');
  end if;

  -- 미완결 pending 주문은 취소하고 예약했던 쿠폰을 돌려준다(재시도 허용).
  for v_stale in
    select * from public.orders
     where user_id = p_user_id and course_id = p_course_id and status = 'pending'
     for update
  loop
    update public.orders
       set status = 'canceled',
           canceled_at = now(),
           cancel_reason = '새 주문으로 대체'
     where id = v_stale.id;
    if v_stale.coupon_code is not null then
      perform public.release_coupon(v_stale.coupon_code);
    end if;
  end loop;

  v_amount := v_course.price_krw;

  if p_coupon_code is not null then
    v_coupon := public.validate_coupon(p_coupon_code, p_course_id);
    if not coalesce((v_coupon->>'valid')::boolean, false) then
      return jsonb_build_object('ok', false, 'reason', 'invalid_coupon');
    end if;
    -- 한도 소진은 여기서 원자적으로 판정된다(검사와 증가가 같은 트랜잭션).
    if not public.reserve_coupon(v_coupon->>'code') then
      return jsonb_build_object('ok', false, 'reason', 'invalid_coupon');
    end if;
    v_code     := v_coupon->>'code';
    v_discount := coalesce((v_coupon->>'discount_krw')::integer, 0);
    v_amount   := coalesce((v_coupon->>'final_krw')::integer, v_amount);
  end if;

  insert into public.orders (user_id, course_id, amount_krw, coupon_code, discount_krw, status)
  values (p_user_id, p_course_id, v_amount, v_code, v_discount, 'pending')
  returning id into v_order_id;

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'amount_krw', v_amount,
    'course_title', v_course.title
  );
end; $$;

revoke execute on function public.open_pending_order(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.open_pending_order(uuid, uuid, text) to service_role;

-- -----------------------------------------------------------------------------
-- C-2 · 수강권 발급 전 주문 정합성 강제.
-- 기존 함수는 인자를 그대로 믿어, 취소·환불된 주문을 들고 온 호출(경합으로 stale해진
-- confirm/webhook)도 발급에 성공했다. 이제 주문이 실제로 paid이고 인자와 일치할 때만 발급한다.
-- -----------------------------------------------------------------------------
create or replace function public.grant_enrollment(
  p_order_id uuid, p_user_id uuid, p_course_id uuid
) returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_id    uuid;
  v_order public.orders%rowtype;
begin
  -- 이미 발급된 주문이면 기존 수강권 반환(멱등)
  select id into v_id from public.enrollments where order_id = p_order_id;
  if v_id is not null then return v_id; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null then
    raise exception 'grant_enrollment: 주문을 찾을 수 없습니다(%)', p_order_id;
  end if;
  if v_order.status <> 'paid' then
    raise exception 'grant_enrollment: 결제 완료되지 않은 주문(% / %)', p_order_id, v_order.status;
  end if;
  if v_order.user_id <> p_user_id or v_order.course_id <> p_course_id then
    raise exception 'grant_enrollment: 주문과 인자가 일치하지 않습니다(%)', p_order_id;
  end if;

  insert into public.enrollments (user_id, course_id, order_id, status, granted_at)
  values (p_user_id, p_course_id, p_order_id, 'active', now())
  on conflict (user_id, course_id) do update
    set status = 'active',
        order_id = excluded.order_id,
        granted_at = now()
  returning id into v_id;
  return v_id;
end; $$;

revoke execute on function public.grant_enrollment(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.grant_enrollment(uuid, uuid, uuid) to service_role;

-- -----------------------------------------------------------------------------
-- H-3 · 부분 취소를 전액 환불로 처리하던 문제 + M-1 · stale 상태 기반 전이.
-- 주문 행을 잠그고 "현재" 상태를 기준으로 전이한다. p_total_canceled_krw는 PG 기준
-- 누적 취소금액이며, 주문 금액에 미달하면 접근권을 회수하지 않는다.
-- cancel_amount_krw는 이 마이그레이션부터 '누적 취소금액'을 뜻한다.
-- -----------------------------------------------------------------------------
create or replace function public.refund_order(
  p_order_id uuid,
  p_reason text,
  p_cancel_key text default null,
  p_total_canceled_krw integer default null,
  p_canceled_at timestamptz default null
) returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_order   public.orders%rowtype;
  v_total   integer;
  v_partial boolean;
  v_next    text;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null then
    raise exception 'refund_order: 주문을 찾을 수 없습니다(%)', p_order_id;
  end if;

  v_total   := coalesce(p_total_canceled_krw, v_order.amount_krw);
  v_partial := v_total < v_order.amount_krw;

  -- 이미 종료된 주문은 no-op 성공(중복 웹훅·재클릭 안전)
  if v_order.status in ('refunded', 'canceled') then
    return jsonb_build_object('transitioned', false, 'partial', false, 'status', v_order.status);
  end if;

  if v_partial then
    -- 부분 취소: 금액·사유만 기록하고 주문 상태와 수강권은 그대로 둔다.
    update public.orders
       set cancel_amount_krw = v_total,
           cancel_reason = p_reason,
           cancel_key = coalesce(p_cancel_key, cancel_key),
           canceled_at = coalesce(p_canceled_at, now())
     where id = p_order_id;
    return jsonb_build_object('transitioned', false, 'partial', true, 'status', v_order.status);
  end if;

  -- 전액 취소: 결제된 주문만 refunded, 미결제는 canceled.
  v_next := case when v_order.status = 'paid' then 'refunded' else 'canceled' end;

  update public.orders
     set status = v_next,
         cancel_amount_krw = v_total,
         cancel_reason = p_reason,
         cancel_key = coalesce(p_cancel_key, cancel_key),
         canceled_at = coalesce(p_canceled_at, now())
   where id = p_order_id;

  -- 수강권은 하드 삭제하지 않고 refunded로 — has_course_access(active만)가 접근을 차단한다.
  update public.enrollments set status = 'refunded' where order_id = p_order_id;

  -- 예약했던 쿠폰 반환(결제까지 간 주문도 취소되면 재고를 돌려준다)
  if v_order.coupon_code is not null then
    perform public.release_coupon(v_order.coupon_code);
  end if;

  return jsonb_build_object('transitioned', true, 'partial', false, 'status', v_next);
end; $$;

revoke execute on function public.refund_order(uuid, text, text, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.refund_order(uuid, text, text, integer, timestamptz) to service_role;
