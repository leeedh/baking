-- DC-114 · Supabase security advisor 정리
-- 1) SECURITY DEFINER 구현을 API에 노출되지 않는 private 스키마로 옮긴다.
--    RLS 정책은 anon 쿼리에서도 평가되므로 private 구현은 anon도 실행 가능해야 하지만,
--    PostgREST(/rest/v1/rpc)로는 호출할 수 없다.
-- 2) public.is_admin / has_course_access는 앱 RPC용 INVOKER 래퍼로 남기고 anon 실행권을 회수한다.
--    (앱은 로그인 이후에만 호출한다)
-- 3) course_catalog를 security_invoker로 전환. RLS에 가려지는 집계(수강생 수·차시 수·총 길이)만
--    private 함수로 계산해 기존과 같은 숫자를 낸다.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function private.has_course_access(p_course_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.enrollments
     where user_id = auth.uid() and course_id = p_course_id and status = 'active'
  );
$$;

-- 공개 카탈로그 집계 — 개별 행이 아니라 숫자만 돌려준다.
create or replace function private.course_public_stats(p_course_id uuid)
returns table (students_count integer, duration_sec integer, lesson_count integer)
language sql stable security definer
set search_path = ''
as $$
  select
    (select count(*) from public.enrollments e
      where e.course_id = p_course_id and e.status = 'active')::integer,
    coalesce((select sum(l.duration_sec) from public.lessons l
      where l.course_id = p_course_id), 0)::integer,
    (select count(*) from public.lessons l where l.course_id = p_course_id)::integer;
$$;

revoke all on function private.is_admin() from public;
revoke all on function private.has_course_access(uuid) from public;
revoke all on function private.course_public_stats(uuid) from public;
grant execute on function private.is_admin() to anon, authenticated, service_role;
grant execute on function private.has_course_access(uuid) to anon, authenticated, service_role;
grant execute on function private.course_public_stats(uuid) to anon, authenticated, service_role;

-- RLS 정책이 private 구현을 직접 참조하도록 교체
alter policy books_admin_modify on public.books
  using (private.is_admin()) with check (private.is_admin());
alter policy books_select_published on public.books
  using (status = 'published' or private.is_admin());
alter policy coupons_admin_all on public.coupons
  using (private.is_admin()) with check (private.is_admin());
alter policy courses_admin_modify on public.courses
  using (private.is_admin()) with check (private.is_admin());
alter policy courses_select_published on public.courses
  using (status = 'published' or private.is_admin());
alter policy enrollments_select_own on public.enrollments
  using (user_id = (select auth.uid()) or (select private.is_admin()));
alter policy inquiries_select_own on public.inquiries
  using (user_id = (select auth.uid()) or private.is_admin());
alter policy inquiries_update_admin on public.inquiries
  using (private.is_admin()) with check (private.is_admin());
alter policy lessons_admin_modify on public.lessons
  using (private.is_admin()) with check (private.is_admin());
alter policy lessons_select_guarded on public.lessons
  using (
    (is_preview = true and exists (
      select 1 from public.courses c where c.id = lessons.course_id and c.status = 'published'))
    or private.has_course_access(course_id)
    or (select private.is_admin())
  );
alter policy materials_admin_modify on public.materials
  using (private.is_admin()) with check (private.is_admin());
alter policy materials_select_enrolled on public.materials
  using (
    private.has_course_access((select lessons.course_id from public.lessons where lessons.id = materials.lesson_id))
    or private.is_admin()
  );
alter policy orders_select_own on public.orders
  using (user_id = (select auth.uid()) or (select private.is_admin()));
alter policy progress_select_admin on public.progress
  using (private.is_admin());
alter policy reviews_delete_own on public.reviews
  using (user_id = (select auth.uid()) or (select private.is_admin()));
alter policy reviews_insert_enrolled on public.reviews
  with check (user_id = (select auth.uid()) and private.has_course_access(course_id));

-- 앱 RPC용 공개 래퍼 — INVOKER, 로그인 사용자만
create or replace function public.is_admin()
returns boolean
language sql stable security invoker
set search_path = ''
as $$ select private.is_admin(); $$;

create or replace function public.has_course_access(p_course_id uuid)
returns boolean
language sql stable security invoker
set search_path = ''
as $$ select private.has_course_access(p_course_id); $$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.has_course_access(uuid) from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.has_course_access(uuid) to authenticated, service_role;

-- reorder_lessons: lessons_admin_modify가 이미 운영자 쓰기를 허용하므로 DEFINER가 필요 없다.
alter function public.reorder_lessons(uuid, uuid[]) security invoker;
revoke all on function public.reorder_lessons(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_lessons(uuid, uuid[]) to authenticated, service_role;

-- validate_coupon은 의도적으로 DEFINER 유지(coupons는 운영자 전용 테이블). anon 차단만 명시.
revoke all on function public.validate_coupon(text, uuid) from public, anon;
grant execute on function public.validate_coupon(text, uuid) to authenticated, service_role;

-- course_catalog: 호출자 권한으로 평가. reviews는 공개 읽기라 평점은 그대로 집계된다.
create or replace view public.course_catalog
with (security_invoker = on) as
select
  c.id, c.slug, c.title, c.description, c.thumbnail_url, c.price_krw, c.list_price_krw,
  c.currency, c.category, c.level, c.tags, c.instructor_title, c.created_at, c.updated_at,
  coalesce((select round(avg(r.rating), 1) from public.reviews r where r.course_id = c.id), 0)::numeric(3,1) as rating,
  (select count(*) from public.reviews r where r.course_id = c.id)::integer as review_count,
  s.students_count,
  s.duration_sec,
  s.lesson_count
from public.courses c
cross join lateral private.course_public_stats(c.id) s
where c.status = 'published';

-- 운영자 집계 뷰는 anon이 읽을 이유가 없다(RLS로 0행이지만 권한 자체를 닫는다).
revoke select on public.admin_course_sales from anon;
revoke select on public.admin_course_stats from anon;
