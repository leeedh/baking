-- =============================================================================
-- DB-MIG-07 · 쿠폰 사용 수 원자적 증가 (결제 확정 시 서버 전용 호출)
-- =============================================================================
create or replace function public.increment_coupon_redemption(p_code text)
returns void language sql security definer set search_path = public
as $$
  update public.coupons
     set redeemed_count = redeemed_count + 1
   where code = upper(trim(p_code))
     and (max_redemptions is null or redeemed_count < max_redemptions);
$$;

revoke execute on function public.increment_coupon_redemption(text) from public, anon, authenticated;
grant  execute on function public.increment_coupon_redemption(text) to service_role;
