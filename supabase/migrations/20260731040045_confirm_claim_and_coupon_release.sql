-- =============================================================================
-- DB-MIG-10 · 2차 리뷰 후속(P1·P2)
--
-- P1) confirm이 주문을 읽어 금액을 검증한 뒤 Toss capture를 호출하는 사이에, 다른 탭의
--     체크아웃이 같은 pending 행의 금액·쿠폰을 바꿀 수 있었다. 그 창에서 Toss는 옛 금액을
--     capture하는데 DB는 새 금액으로 paid가 되어 결제 기록과 쿠폰 정산이 어긋난다.
--     → capture 직전에 주문을 **원자적으로 선점(claim)** 한다: 행을 잠그고 금액·소유자·
--        수강권을 재확인한 뒤 status를 'confirming'으로 바꾼다. 선점에 성공한 요청만
--        Toss를 호출하므로, 금액이 바뀌었으면 capture 자체가 일어나지 않는다.
--        'confirming'은 동시에 하나만 존재할 수 있어 이중 capture(H-1)의 최종 방어선이기도 하다.
--
-- P2) 확정적 실패(confirm 4xx)에서 쿠폰 예약이 24시간 스윕까지 묶여 있었다. 'failed' 주문은
--     열린-주문 유니크 인덱스 대상이 아니라, 잘못된 paymentKey로 반복 시도하면 한정 쿠폰
--     재고를 계속 묶을 수 있었다.
--     → failed에서도 예약을 즉시 반환한다. 대신 webhook 복구(failed→paid)에서 재예약한다.
-- =============================================================================

-- 1) 결제 승인 진행 중 상태 추가
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending', 'confirming', 'paid', 'failed', 'canceled', 'refunded'));

-- -----------------------------------------------------------------------------
-- 2) capture 선점 — 이 함수를 통과한 요청만 Toss confirm(=capture)을 호출할 수 있다.
-- -----------------------------------------------------------------------------
create or replace function public.claim_order_for_confirm(
  p_order_id uuid, p_user_id uuid, p_amount_krw integer
) returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null or v_order.user_id <> p_user_id then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  -- 이미 확정된 주문 → 멱등 성공(webhook이 먼저 처리했거나 재시도)
  if v_order.status = 'paid' then
    return jsonb_build_object('ok', false, 'reason', 'already_paid',
                              'course_id', v_order.course_id);
  end if;
  if v_order.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_state',
                              'status', v_order.status);
  end if;

  -- 금액은 여기서 다시 본다 — 읽기~capture 사이에 바뀌었을 수 있다(P1).
  if v_order.amount_krw <> p_amount_krw then
    return jsonb_build_object('ok', false, 'reason', 'amount_mismatch');
  end if;

  -- 이미 보유한 클래스면 capture하지 않는다(미승인 인증은 만료되어 청구되지 않는다).
  if exists (
    select 1 from public.enrollments
     where user_id = v_order.user_id and course_id = v_order.course_id and status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_enrolled');
  end if;

  -- 같은 강좌의 다른 주문이 이미 결제됐거나 승인 진행 중이면 중복 capture를 막는다(H-1).
  if exists (
    select 1 from public.orders
     where user_id = v_order.user_id and course_id = v_order.course_id
       and id <> v_order.id and status in ('paid', 'confirming')
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_in_progress');
  end if;

  update public.orders set status = 'confirming' where id = v_order.id;

  return jsonb_build_object('ok', true, 'course_id', v_order.course_id,
                            'amount_krw', v_order.amount_krw);
end; $$;

revoke execute on function public.claim_order_for_confirm(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_order_for_confirm(uuid, uuid, integer) to service_role;

-- -----------------------------------------------------------------------------
-- 3) 결제 완료 전이 — confirm/webhook 공용. 실제 전이자만 true를 받는다.
--    failed에서 되살아나는 경우(webhook 복구)에는 반환했던 쿠폰 예약을 다시 잡는다(P2).
-- -----------------------------------------------------------------------------
create or replace function public.mark_order_paid(
  p_order_id uuid,
  p_payment_key text,
  p_payment_method text default null,
  p_paid_at timestamptz default null
) returns boolean language plpgsql security definer set search_path = public
as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null then
    raise exception 'mark_order_paid: 주문을 찾을 수 없습니다(%)', p_order_id;
  end if;
  if v_order.status not in ('pending', 'confirming', 'failed') then
    return false;  -- 이미 paid이거나 취소·환불된 주문 — 전이자가 아니다
  end if;

  update public.orders
     set status = 'paid',
         payment_key = p_payment_key,
         payment_method = p_payment_method,
         paid_at = coalesce(p_paid_at, now())
   where id = p_order_id;

  -- 확정 실패로 반환했던 예약을 되돌린다. 한도를 넘겼다면 잡히지 않지만, 이미 승인된
  -- 결제를 되돌릴 수는 없으므로 결제를 우선하고 정산 리포트에서 보정한다.
  if v_order.status = 'failed' and v_order.coupon_code is not null then
    perform public.reserve_coupon(v_order.coupon_code);
  end if;

  return true;
end; $$;

revoke execute on function public.mark_order_paid(uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.mark_order_paid(uuid, text, text, timestamptz) to service_role;

-- -----------------------------------------------------------------------------
-- 4) 미결제 종료 — 'confirming'에서도 닫을 수 있고, failed도 예약을 즉시 반환한다(P2).
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
  if v_order.id is null or v_order.status not in ('pending', 'confirming') then
    return false;  -- 이미 결제됐거나 종료된 주문 — 건드리지 않는다(멱등)
  end if;

  update public.orders
     set status = p_status,
         cancel_reason = coalesce(p_reason, cancel_reason),
         canceled_at = case when p_status = 'canceled' then now() else canceled_at end
   where id = p_order_id;

  -- 미결제로 끝난 주문이 한정 쿠폰 재고를 묶어두지 않게 즉시 반환한다.
  -- (webhook이 뒤늦게 되살리면 mark_order_paid가 다시 예약한다.)
  if v_order.coupon_code is not null then
    perform public.release_coupon(v_order.coupon_code);
  end if;

  return true;
end; $$;

revoke execute on function public.close_unpaid_order(uuid, text, text) from public, anon, authenticated;
grant execute on function public.close_unpaid_order(uuid, text, text) to service_role;

-- -----------------------------------------------------------------------------
-- 5) 만료 스윕 — 승인 중 상태로 멈춘 주문도 회수한다(5xx/타임아웃 뒤 webhook도 오지 않은 경우).
--    ※ 기준 기간은 후속 마이그레이션(20260731040154)에서 7일로 넓혔다.
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
     where status in ('pending', 'confirming', 'failed')
       and created_at < now() - p_max_age
     for update skip locked
  loop
    update public.orders
       set status = 'canceled',
           canceled_at = now(),
           cancel_reason = coalesce(cancel_reason, '미결제 만료')
     where id = v_row.id;
    -- failed는 close_unpaid_order에서 이미 반환됐다 — 중복 반환하지 않는다.
    if v_row.coupon_code is not null and v_row.status in ('pending', 'confirming') then
      perform public.release_coupon(v_row.coupon_code);
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end; $$;

revoke execute on function public.expire_stale_pending_orders(interval) from public, anon, authenticated;
grant execute on function public.expire_stale_pending_orders(interval) to service_role;
