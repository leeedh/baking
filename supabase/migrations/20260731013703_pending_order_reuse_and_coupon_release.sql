-- =============================================================================
-- DB-MIG-09 · 코드리뷰 후속(P1·P2) — 20260731010430에서 들어간 두 회귀를 잡는다.
--
-- P1) open_pending_order가 기존 pending 주문을 '취소'했다. 결제창이 이미 열린 주문을
--     무효화하면 Toss는 capture하는데 우리 DB는 canceled → completePaidOrder의 전이 가드에
--     걸리고 grant_enrollment도 거부해, **청구는 됐는데 수강권이 없는 상태**가 만들어졌다.
--     → 취소하지 않고 같은 행을 재사용(금액·쿠폰만 갱신)한다. 살아 있는 주문은 언제나 1건이므로
--        유니크 인덱스도 그대로 만족하고, 진행 중인 confirm의 orderId도 유효하게 남는다.
--        금액이 바뀐 경우 confirm은 금액 불일치(400)로 **capture 전에** 안전하게 거절된다.
--
-- P2) 쿠폰을 주문 생성 시점에 예약하게 되면서, 결제까지 가지 않은 주문의 예약이 영구히
--     남았다(해제 경로가 '대체'와 '전액 환불'뿐이었다). 한정 쿠폰이면 결제창만 열고 이탈해도
--     재고가 고갈된다.
--     → 확정적 미결제 종료(canceled)에서 즉시 반환 + 오래된 pending/failed를 만료시켜 반환.
--        'failed'는 webhook 복구 경로(승인됐는데 confirm이 실패한 경우)가 있어 즉시 반환하지
--        않고 만료 스윕에 맡긴다 — 복구는 수분 내에 일어나고 스윕 기준은 24시간이다.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 미결제 종료 공통 처리 — pending에서만 전이(멱등), canceled면 쿠폰 예약 반환.
-- -----------------------------------------------------------------------------
create or replace function public.close_unpaid_order(
  p_order_id uuid, p_status text, p_reason text default null
) returns boolean language plpgsql security definer set search_path = public
as $$
declare v_order public.orders%rowtype;
begin
  if p_status not in ('failed', 'canceled') then
    raise exception 'close_unpaid_order: 허용되지 않는 상태(%)', p_status;
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null or v_order.status <> 'pending' then
    return false;  -- 이미 결제됐거나 종료된 주문 — 건드리지 않는다(멱등)
  end if;

  update public.orders
     set status = p_status,
         cancel_reason = coalesce(p_reason, cancel_reason),
         canceled_at = case when p_status = 'canceled' then now() else canceled_at end
   where id = p_order_id;

  -- failed는 webhook이 되살릴 수 있으므로 예약을 유지한다(만료 스윕이 정리).
  if p_status = 'canceled' and v_order.coupon_code is not null then
    perform public.release_coupon(v_order.coupon_code);
  end if;

  return true;
end; $$;

revoke execute on function public.close_unpaid_order(uuid, text, text) from public, anon, authenticated;
grant execute on function public.close_unpaid_order(uuid, text, text) to service_role;

-- -----------------------------------------------------------------------------
-- 오래된 미결제 주문 만료 — 쿠폰 재고를 회수한다.
-- 스케줄러가 없으므로 주문 생성 시 기회적으로 호출한다(status 인덱스 + skip locked라 저렴).
-- 기준을 24시간으로 크게 잡는 이유: 결제창 유효시간(수십 분)과 webhook 복구 시간을 넘겨야
-- 진행 중인 결제를 잘못 만료시키지 않는다(P1과 같은 사고 방지).
-- -----------------------------------------------------------------------------
create or replace function public.expire_stale_pending_orders(
  p_max_age interval default interval '24 hours'
) returns integer language plpgsql security definer set search_path = public
as $$
declare
  v_row   public.orders%rowtype;
  v_count integer := 0;
begin
  for v_row in
    select * from public.orders
     where status in ('pending', 'failed')
       and created_at < now() - p_max_age
     for update skip locked
  loop
    update public.orders
       set status = 'canceled',
           canceled_at = now(),
           cancel_reason = coalesce(cancel_reason, '미결제 만료')
     where id = v_row.id;
    if v_row.coupon_code is not null then
      perform public.release_coupon(v_row.coupon_code);
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end; $$;

revoke execute on function public.expire_stale_pending_orders(interval) from public, anon, authenticated;
grant execute on function public.expire_stale_pending_orders(interval) to service_role;

-- -----------------------------------------------------------------------------
-- 주문 생성 — 기존 pending 주문을 취소하지 않고 재사용한다(P1).
-- -----------------------------------------------------------------------------
create or replace function public.open_pending_order(
  p_user_id uuid, p_course_id uuid, p_coupon_code text default null
) returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_course   public.courses%rowtype;
  v_existing public.orders%rowtype;
  v_coupon   jsonb;
  v_amount   integer;
  v_discount integer := 0;
  v_code     text := null;
  v_order_id uuid;
begin
  -- 방치된 주문이 물고 있던 쿠폰 재고를 먼저 회수한다(P2).
  perform public.expire_stale_pending_orders();

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

  -- 진행 중일 수 있는 pending 주문은 취소하지 않고 잠근 뒤 재사용한다.
  select * into v_existing
    from public.orders
   where user_id = p_user_id and course_id = p_course_id and status = 'pending'
   for update;

  v_amount := v_course.price_krw;

  if p_coupon_code is not null then
    v_coupon := public.validate_coupon(p_coupon_code, p_course_id);
    if not coalesce((v_coupon->>'valid')::boolean, false) then
      return jsonb_build_object('ok', false, 'reason', 'invalid_coupon');
    end if;
    v_code := v_coupon->>'code';

    -- 같은 쿠폰을 다시 적용하는 경우엔 기존 예약을 그대로 쓴다(중복 차감 방지).
    if v_existing.id is null or v_existing.coupon_code is distinct from v_code then
      -- 한도 소진은 여기서 원자적으로 판정된다(검사와 증가가 같은 트랜잭션).
      if not public.reserve_coupon(v_code) then
        return jsonb_build_object('ok', false, 'reason', 'invalid_coupon');
      end if;
      if v_existing.id is not null and v_existing.coupon_code is not null then
        perform public.release_coupon(v_existing.coupon_code);
      end if;
    end if;

    v_discount := coalesce((v_coupon->>'discount_krw')::integer, 0);
    v_amount   := coalesce((v_coupon->>'final_krw')::integer, v_amount);
  elsif v_existing.id is not null and v_existing.coupon_code is not null then
    -- 쿠폰을 뗀 채 다시 열었다면 예약을 반환한다.
    perform public.release_coupon(v_existing.coupon_code);
  end if;

  if v_existing.id is not null then
    update public.orders
       set amount_krw = v_amount,
           coupon_code = v_code,
           discount_krw = v_discount
     where id = v_existing.id
    returning id into v_order_id;
  else
    insert into public.orders (user_id, course_id, amount_krw, coupon_code, discount_krw, status)
    values (p_user_id, p_course_id, v_amount, v_code, v_discount, 'pending')
    returning id into v_order_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'amount_krw', v_amount,
    'course_title', v_course.title
  );
end; $$;

revoke execute on function public.open_pending_order(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.open_pending_order(uuid, uuid, text) to service_role;
