-- =============================================================================
-- DB-MIG-11 · 코드리뷰 M-2 · M-3 · M-4 · 컬럼 단위 권한 보강
--
-- 세 건 모두 공격면은 **PostgREST 직접 호출**이다. 앱 라우트는 이미 올바른 컬럼만
-- 쓰지만(api/reviews·api/inquiries), 공격자는 라우트를 우회해 anon-key로 REST에
-- 직접 요청할 수 있다. 현재 RLS는 **행만 보고 컬럼을 가리지 않는다**.
--
-- 이는 C-1(profiles.role 자가 승격)과 같은 결함 형태이며, C-1에서 확립한
-- "행 소유권은 RLS가, 컬럼 변경 범위는 GRANT가" 규약(20260731010206)을
-- 남은 세 곳에 일관되게 적용한다. 앱 코드 변경은 없다.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- M-2 · reviews : 미수강 강좌로의 리뷰 '이동' 차단
--
-- reviews_modify_own은 `user_id = auth.uid()`만 보고 어떤 컬럼이든 바꾸게 둔다.
-- 따라서 본인 후기의 course_id를 미수강 강좌로 바꿔 리뷰를 옮길 수 있다
-- (reviews_insert_enrolled의 has_course_access 검사를 UPDATE로 우회).
--
-- 정책의 with check에 has_course_access를 더하는 대신 course_id/user_id를 아예
-- 쓸 수 없게 만든다 — 전자는 **환불로 수강권이 회수된 사용자가 기존 후기의
-- 오타조차 고치지 못하는** 의도치 않은 동작 변경을 낳기 때문이다.
-- 컬럼 권한으로 막으면 이동(=공격)만 불가능해지고 정상 수정은 그대로다.
--
-- INSERT는 손대지 않는다: reviews_insert_enrolled가 이미
-- `user_id = auth.uid() and has_course_access(course_id)`를 강제한다.
-- reviews_set_updated_at(BEFORE) 트리거의 대입은 컬럼 권한 검사 대상이 아니다.
-- -----------------------------------------------------------------------------
revoke update on public.reviews from anon, authenticated;
grant  update (rating, content, updated_at) on public.reviews to authenticated;

-- -----------------------------------------------------------------------------
-- M-3 · inquiries : 답변·상태 필드 주입 차단
--
-- inquiries_insert_own은 `user_id = auth.uid()`만 보므로, 회원이 REST로 직접
-- status='answered' / answer_body / answered_by를 실어 **운영자 답변을 위조**할 수
-- 있었다(작성자 본인은 그 행을 읽을 수 있으므로 화면에도 그대로 노출된다).
--
-- 허용 컬럼만 남기면 나머지는 INSERT 문에 등장할 수 없고 기본값이 적용된다
-- (status는 default 'open'). 운영자 답변 경로(api/admin/inquiries/[id])는
-- createAdminClient() = service_role이라 컬럼 권한 밖이므로 영향이 없다.
-- UPDATE 권한은 건드리지 않는다 — inquiries_update_admin이 이미 is_admin() 게이트.
-- -----------------------------------------------------------------------------
revoke insert on public.inquiries from anon, authenticated;
grant  insert (user_id, category, subject, body) on public.inquiries to authenticated;

-- -----------------------------------------------------------------------------
-- M-4 · profiles : anon의 관리자 열거 차단
--
-- profiles_select_public은 `using (true)`라 비로그인 사용자가
-- `/rest/v1/profiles?select=id,role&role=eq.admin`으로 **관리자 계정을 열거**할 수
-- 있었다. C-1로 자가 승격은 봉쇄됐지만 표적 선정을 그대로 도와준다.
--
-- 행 정책은 유지하고 anon이 읽을 수 있는 컬럼만 좁힌다. anon에게 실제로 필요한
-- 것은 공개 강좌 상세의 후기 작성자 표시뿐이다(lib/catalog.ts의
-- `profiles(display_name, avatar_url)` 임베드 조인).
--
-- authenticated의 SELECT는 그대로 둔다 — AuthProvider와 getProfile()이 자기 행의
-- role을 읽어야 관리자 UI와 requireAdmin()이 동작한다.
--
-- 안전 근거: is_admin()·has_course_access()는 security definer라 정책 내부에서
-- profiles.role을 읽을 때 호출자의 컬럼 권한이 적용되지 않는다. 따라서 anon이
-- 평가하는 courses_select_published 등 모든 정책이 정상 동작한다.
--
-- 잔여 위험: 계정을 가진 공격자는 여전히 타인의 role을 읽을 수 있다. 근본 차단은
-- 공개 뷰 분리가 필요하나 PostgREST 임베드 조인을 갈아야 해 범위에서 제외했다.
-- -----------------------------------------------------------------------------
revoke select on public.profiles from anon;
grant  select (id, display_name, avatar_url) on public.profiles to anon;
