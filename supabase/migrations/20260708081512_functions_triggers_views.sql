-- =============================================================================
-- DB-MIG-02 · Functions / Triggers / Views (DBSchema v1.0 §4)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- DB-TRG-AU · set_updated_at (BEFORE UPDATE, 모든 테이블)
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create trigger profiles_set_updated_at    before update on public.profiles    for each row execute function public.set_updated_at();
create trigger courses_set_updated_at     before update on public.courses     for each row execute function public.set_updated_at();
create trigger lessons_set_updated_at     before update on public.lessons     for each row execute function public.set_updated_at();
create trigger materials_set_updated_at   before update on public.materials   for each row execute function public.set_updated_at();
create trigger orders_set_updated_at      before update on public.orders      for each row execute function public.set_updated_at();
create trigger enrollments_set_updated_at before update on public.enrollments for each row execute function public.set_updated_at();
create trigger progress_set_updated_at    before update on public.progress    for each row execute function public.set_updated_at();
create trigger reviews_set_updated_at     before update on public.reviews     for each row execute function public.set_updated_at();
create trigger coupons_set_updated_at     before update on public.coupons     for each row execute function public.set_updated_at();
create trigger books_set_updated_at       before update on public.books       for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- DB-F-02 · is_admin (RLS 관리자 판별 헬퍼)
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;

-- -----------------------------------------------------------------------------
-- DB-F-03 · has_course_access (활성 수강권 보유 여부 — 영상/자료 RLS 핵심)
--   RLS 재귀 회피를 위해 security definer.
-- -----------------------------------------------------------------------------
create or replace function public.has_course_access(p_course_id uuid)
returns boolean language sql security definer set search_path = public stable
as $$
  select exists(
    select 1 from public.enrollments
    where user_id = auth.uid() and course_id = p_course_id and status = 'active'
  );
$$;

-- -----------------------------------------------------------------------------
-- DB-F-01 · grant_enrollment (결제 후 멱등 수강권 발급, TS-API-20)
-- -----------------------------------------------------------------------------
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
  on conflict (user_id, course_id) do update set status = 'active'
  returning id into v_id;
  return v_id;
end; $$;

-- -----------------------------------------------------------------------------
-- DB-TRG-01 · handle_new_user (auth.users AFTER INSERT → profiles 자동 생성)
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, role, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    'student',
    coalesce(new.raw_user_meta_data->>'locale', 'ko')
  );
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- DB-V-01 · admin_course_sales (운영 대시보드 매출·수강 집계, PRD-F-11)
--   security_invoker=on → 밑단 orders/enrollments RLS(is_admin)로 보호(운영자만 실집계).
-- -----------------------------------------------------------------------------
create view public.admin_course_sales
with (security_invoker = on) as
  select
    c.id    as course_id,
    c.title,
    count(distinct e.id) filter (where e.status = 'active')          as active_enrollments,
    coalesce(sum(o.amount_krw) filter (where o.status = 'paid'), 0)  as gross_krw
  from public.courses c
  left join public.orders      o on o.course_id = c.id
  left join public.enrollments e on e.course_id = c.id
  group by c.id, c.title;

-- -----------------------------------------------------------------------------
-- course_catalog (신설) · 카탈로그 파생지표 뷰 (성능 PRD-NF-01)
--   rating/review_count/students_count/duration_sec를 컬럼 저장 대신 집계로 파생.
--   ⚠️ 의도적 SECURITY DEFINER(security_invoker=off): students_count(enrollments)·
--   duration_sec(lessons)는 RLS로 보호되는 테이블이라 invoker 권한으론 익명 사용자에게
--   0으로 집계된다. 공개 카탈로그는 published 클래스의 공개용 집계(수강생 수·총 재생시간)를
--   보여야 하므로 정의자 권한으로 집계하되 WHERE status='published'로만 한정 → 초안·PII 미노출.
--   팬아웃 방지를 위해 스칼라 서브쿼리 사용.
-- -----------------------------------------------------------------------------
create view public.course_catalog
with (security_invoker = off) as
  select
    c.id, c.slug, c.title, c.description, c.thumbnail_url,
    c.price_krw, c.list_price_krw, c.currency,
    c.category, c.level, c.tags, c.instructor_title,
    c.created_at, c.updated_at,
    coalesce((select round(avg(r.rating), 1) from public.reviews r where r.course_id = c.id), 0)::numeric(3,1)
                                                                                        as rating,
    (select count(*) from public.reviews r     where r.course_id = c.id)::int           as review_count,
    (select count(*) from public.enrollments e where e.course_id = c.id
                                              and e.status = 'active')::int              as students_count,
    coalesce((select sum(l.duration_sec) from public.lessons l where l.course_id = c.id), 0)::int
                                                                                        as duration_sec,
    (select count(*) from public.lessons l     where l.course_id = c.id)::int           as lesson_count
  from public.courses c
  where c.status = 'published';

-- 공개 카탈로그 뷰는 익명/인증 사용자 모두 읽기 허용(published만 노출됨).
grant select on public.course_catalog to anon, authenticated;
