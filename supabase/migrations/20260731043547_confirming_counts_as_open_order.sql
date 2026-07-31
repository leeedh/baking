-- =============================================================================
-- DB-MIG-12 · 3차 리뷰 후속 — 'confirming'을 "살아 있는 주문"으로 일관되게 취급한다.
--
-- 문제: 유니크 인덱스가 (pending, paid)만 덮고 open_pending_order도 'pending'만 찾아,
--       승인 진행 중(confirming)인 주문이 있는데도 두 번째 pending 주문이 만들어질 수 있었다.
--       그 상태에서 첫 결제가 capture되면 mark_order_paid의 confirming → paid 전이가
--       유니크 인덱스에 걸려 실패한다 → **청구는 됐는데 수강권이 없는 상태**.
--       claim의 already_in_progress 체크는 두 번째 주문의 *capture*만 막지 *생성*은 막지 못한다.
--
-- 해결: 인덱스 술어와 주문 생성 경로 모두에서 confirming을 열린 주문으로 센다.
--       단, confirming 주문은 **재사용(금액 변경)하지 않는다** — 승인 진행 중인 주문의
--       금액을 바꾸면 앞서 고친 P1(capture 금액과 DB 금액 불일치)이 되살아난다.
-- =============================================================================

drop index if exists public.orders_user_course_open_uk;
create unique index orders_user_course_open_uk
  on public.orders (user_id, course_id)
  where status in ('pending', 'confirming', 'paid');

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
  -- 방치된 주문이 물고 있던 쿠폰 재고를 먼저 회수한다.
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

  -- 결제 완료 주문이 살아 있으면 새 주문을 열지 않는다.
  if exists (
    select 1 from public.orders
     where user_id = p_user_id and course_id = p_course_id and status = 'paid'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_paid');
  end if;

  -- 승인 진행 중인 주문은 건드리지도, 새로 만들지도 않는다.
  -- (건드리면 capture 금액과 DB 금액이 어긋나고, 새로 만들면 confirming → paid 전이가
  --  유니크 인덱스에 걸려 "청구됐는데 수강권 없음"이 된다.)
  if exists (
    select 1 from public.orders
     where user_id = p_user_id and course_id = p_course_id and status = 'confirming'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'confirm_in_progress');
  end if;

  -- 진행 전(pending) 주문만 잠근 뒤 재사용한다.
  select * into v_existing
    from public.orders
   where user_id = p_user_id and course_id = p_course_id and status = 'pending'
   for update;

  -- 잠근 사이에 confirm이 선점했을 수 있다 — 다시 확인한다.
  if v_existing.id is not null and v_existing.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'confirm_in_progress');
  end if;

  v_amount := v_course.price_krw;

  if p_coupon_code is not null then
    v_coupon := public.validate_coupon(p_coupon_code, p_course_id);
    if not coalesce((v_coupon->>'valid')::boolean, false) then
      return jsonb_build_object('ok', false, 'reason', 'invalid_coupon');
    end if;
    v_code := v_coupon->>'code';

    -- 같은 쿠폰을 다시 적용하는 경우엔 기존 예약을 그대로 쓴다(중복 차감 방지).
    if v_existing.id is null or v_existing.coupon_code is distinct from v_code then
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
    perform public.release_coupon(v_existing.coupon_code);
  end if;

  if v_existing.id is not null then
    update public.orders
       set amount_krw = v_amount,
           coupon_code = v_code,
           discount_krw = v_discount
     where id = v_existing.id and status = 'pending'
    returning id into v_order_id;

    -- 갱신 직전에 confirm이 선점했다면 0행 — 진행 중 주문을 건드리지 않고 물러난다.
    if v_order_id is null then
      return jsonb_build_object('ok', false, 'reason', 'confirm_in_progress');
    end if;
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
