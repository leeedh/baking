-- =============================================================================
-- DB-MIG-04 · Security / Performance 하드닝 (Supabase advisor 대응)
-- =============================================================================

-- 1) set_updated_at: search_path 고정 (function_search_path_mutable)
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- 2) SECURITY DEFINER 함수 중 RLS에 쓰이지 않는 것은 RPC 노출 차단.
--    grant_enrollment: 서버(service_role)만 호출해야 함 — anon/authenticated가 호출하면
--                      결제 없이 수강권 자가발급 가능 → 차단.
--    handle_new_user : auth.users 트리거 전용 — RPC로 호출될 이유 없음.
--    (is_admin/has_course_access는 RLS 정책 내부에서 anon/authenticated 권한으로 평가되므로
--     EXECUTE 유지 필요 → 의도적으로 유지.)
revoke execute on function public.grant_enrollment(uuid, uuid, uuid) from public, anon, authenticated;
grant  execute on function public.grant_enrollment(uuid, uuid, uuid) to service_role;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 3) RLS initplan 최적화: auth.uid()/헬퍼를 (select ...)로 감싸 행마다 재평가 방지.
alter policy "profiles_update_self" on public.profiles
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

alter policy "orders_select_own" on public.orders
  using (user_id = (select auth.uid()) or (select public.is_admin()));

alter policy "enrollments_select_own" on public.enrollments
  using (user_id = (select auth.uid()) or (select public.is_admin()));

alter policy "progress_all_own" on public.progress
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter policy "reviews_insert_enrolled" on public.reviews
  with check (user_id = (select auth.uid()) and public.has_course_access(course_id));

alter policy "reviews_modify_own" on public.reviews
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter policy "reviews_delete_own" on public.reviews
  using (user_id = (select auth.uid()) or (select public.is_admin()));
