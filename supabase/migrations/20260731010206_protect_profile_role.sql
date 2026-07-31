-- =============================================================================
-- DB-MIG-06 · 코드리뷰 C-1 · profiles.role 자가 승격 봉쇄
--
-- profiles_update_self는 `id = auth.uid()`만 보고 컬럼을 가리지 않아, 로그인 회원이
-- PostgREST로 자기 행의 role을 'admin'으로 바꿀 수 있었다. is_admin()과 앱의
-- requireAdmin()이 모두 이 컬럼을 보므로 이중 방어가 동시에 무너지는 구조였다.
--
-- 1차 방어: 테이블 단위 UPDATE 권한을 회수하고 사용자가 고쳐도 되는 컬럼만 다시 부여.
-- 2차 방어: BEFORE UPDATE 트리거가 anon/authenticated의 role 변경을 조용히 되돌린다.
--           (승격은 service_role 경로 — 관리자 콘솔/서버 — 로만 가능하다.)
-- =============================================================================

create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- service_role/postgres 등 서버 경로는 통과. 최종 사용자 역할만 차단한다.
  if current_user in ('anon', 'authenticated') and new.role is distinct from old.role then
    new.role := old.role;
  end if;
  return new;
end; $$;

revoke execute on function public.protect_profile_role() from public, anon, authenticated;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- 컬럼 권한: role(과 id/created_at)은 사용자가 직접 쓸 수 없다.
revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_url, locale, updated_at) on public.profiles to authenticated;
