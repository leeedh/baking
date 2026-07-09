-- =============================================================================
-- DB-MIG-03 · Row Level Security 정책 (DBSchema v1.0 §2)
-- 접근 제어 사슬: enrollments(active) → has_course_access() → lessons/materials.
-- =============================================================================

-- DB-T-01 · profiles : public-read + owner-update (role 변경은 서버/관리자만)
alter table public.profiles enable row level security;

create policy "profiles_select_public" on public.profiles
  for select using (true);

create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- DB-T-02 · courses : public-read(published) + admin-write
alter table public.courses enable row level security;

create policy "courses_select_published" on public.courses
  for select using (status = 'published' or public.is_admin());

create policy "courses_admin_modify" on public.courses
  for all using (public.is_admin()) with check (public.is_admin());

-- DB-T-03 · lessons : 미리보기 OR 활성 수강권 OR 관리자
alter table public.lessons enable row level security;

create policy "lessons_select_guarded" on public.lessons
  for select using (
    is_preview = true
    or public.has_course_access(course_id)
    or public.is_admin()
  );

create policy "lessons_admin_modify" on public.lessons
  for all using (public.is_admin()) with check (public.is_admin());

-- DB-T-04 · materials : 수강권 보유자 OR 관리자
alter table public.materials enable row level security;

create policy "materials_select_enrolled" on public.materials
  for select using (
    public.has_course_access((select course_id from public.lessons where id = lesson_id))
    or public.is_admin()
  );

create policy "materials_admin_modify" on public.materials
  for all using (public.is_admin()) with check (public.is_admin());

-- DB-T-05 · orders : owner-read + admin-read (INSERT/UPDATE는 service_role 전용 → 정책 미부여)
alter table public.orders enable row level security;

create policy "orders_select_own" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());

-- DB-T-06 · enrollments : owner-read + admin-read (발급은 grant_enrollment/service_role만)
alter table public.enrollments enable row level security;

create policy "enrollments_select_own" on public.enrollments
  for select using (user_id = auth.uid() or public.is_admin());

-- DB-T-07 · progress : owner-only(전체)
alter table public.progress enable row level security;

create policy "progress_all_own" on public.progress
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- DB-T-08 · reviews : public-read + 수강자 작성 + 본인 수정/삭제(+관리자 삭제)
alter table public.reviews enable row level security;

create policy "reviews_select_public" on public.reviews
  for select using (true);

create policy "reviews_insert_enrolled" on public.reviews
  for insert with check (
    user_id = auth.uid() and public.has_course_access(course_id)
  );

create policy "reviews_modify_own" on public.reviews
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "reviews_delete_own" on public.reviews
  for delete using (user_id = auth.uid() or public.is_admin());

-- DB-T-09 · coupons : 서버 전용(코드 열거 방지, 일반 SELECT 정책 없음) + 관리자 관리
alter table public.coupons enable row level security;

create policy "coupons_admin_all" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

-- DB-T-10 · books : public-read(published) + admin-write
alter table public.books enable row level security;

create policy "books_select_published" on public.books
  for select using (status = 'published' or public.is_admin());

create policy "books_admin_modify" on public.books
  for all using (public.is_admin()) with check (public.is_admin());
