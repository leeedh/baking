-- 코드리뷰 #1 · grant_enrollment 재활성 시 order_id 재연결.
-- 기존 ON CONFLICT는 status만 되살려, 환불→재구매 시 수강권이 과거(환불된) 주문을
-- 계속 가리켰다. 그 결과 재구매한 주문을 다시 환불해도 refundOrder가 order_id 기준으로
-- 회수하지 못해(0행 매칭) 접근이 유지되는 결함이 있었다.
-- 재활성 시 order_id·granted_at을 현재 결제 주문으로 갱신해 항상 유효 주문을 가리키게 한다.
-- (create or replace는 기존 EXECUTE 권한 — service_role 전용 — 을 보존한다.)
create or replace function public.grant_enrollment(
  p_order_id uuid, p_user_id uuid, p_course_id uuid
) returns uuid language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  -- 이미 발급된 주문이면 기존 수강권 반환(멱등)
  select id into v_id from public.enrollments where order_id = p_order_id;
  if v_id is not null then return v_id; end if;

  insert into public.enrollments (user_id, course_id, order_id, status, granted_at)
  values (p_user_id, p_course_id, p_order_id, 'active', now())
  on conflict (user_id, course_id) do update
    set status = 'active',
        order_id = excluded.order_id,
        granted_at = now()
  returning id into v_id;
  return v_id;
end; $$;
