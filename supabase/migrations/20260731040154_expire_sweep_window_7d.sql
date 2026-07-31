-- =============================================================================
-- DB-MIG-11 · 만료 스윕 기준을 24시간 → 7일로 넓힌다.
--
-- 이유: 가상계좌는 입금까지 며칠이 걸릴 수 있어(WAITING_FOR_DEPOSIT) 24시간 스윕이
-- 정상 결제 대기 주문을 취소해 버린다. 한편 P2 수정으로 failed·canceled는 쿠폰 예약을
-- 즉시 반환하므로, 스윕은 "완전히 방치된 주문"만 정리하는 백스톱으로 충분하다.
-- =============================================================================

create or replace function public.expire_stale_pending_orders(
  p_max_age interval default interval '7 days'
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
