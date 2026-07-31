-- =============================================================================
-- seed.local.sql · **로컬 전용** 계정 시드 (코드리뷰 H-6)
--
-- ⚠️ 절대 운영/원격 프로젝트에 적용하지 말 것. 고정 비밀번호(password123)의
--    관리자 계정을 만들기 때문에, 적용되는 순간 누구나 관리자로 로그인할 수 있다.
--    원래 seed.sql 안에 있어 원격 적용 시 사고가 날 수 있었으므로 분리했다.
--
-- 사용: 로컬 `supabase db reset` 이후 이 파일을 수동으로 실행한다.
--   psql "$LOCAL_DB_URL" -f supabase/seed.local.sql
--
-- 후기(reviews)는 이 계정들을 참조하므로 함께 둔다.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. 테스트 계정 (auth.users) — on_auth_user_created 트리거가 profiles 자동 생성.
--    ℹ️ auth.identities 행은 만들지 않는다(FK/후기 연결·역할 시드가 목적).
--       GoTrue 이메일+비밀번호 로그인까지 검증하려면 EPIC-C에서 identities 시드 추가 필요.
-- -----------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'admin@ateliercreme.com',        extensions.crypt('password123', extensions.gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}', '{"name":"민소희","locale":"ko"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
   'eunji.kim@example.com',         extensions.crypt('password123', extensions.gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}', '{"name":"김은지 (Eunji Kim)","locale":"ko"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
   'chaojung.chen@example.com',     extensions.crypt('password123', extensions.gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}', '{"name":"Chao-Jung Chen","locale":"en"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated',
   'dohyun.park@example.com',       extensions.crypt('password123', extensions.gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}', '{"name":"박도현 (Dohyun Park)","locale":"ko"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated',
   'jisoo.lee@example.com',         extensions.crypt('password123', extensions.gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}', '{"name":"이지수 (Jisoo Lee)","locale":"ko"}', now(), now());

-- GoTrue는 토큰 컬럼을 non-nullable Go string으로 스캔하므로 NULL이면 로그인 시 500이 난다.
-- 수동 시드한 계정의 해당 컬럼을 ''로 정규화(로그인 가능하게).
update auth.users
set confirmation_token         = coalesce(confirmation_token, ''),
    recovery_token             = coalesce(recovery_token, ''),
    email_change               = coalesce(email_change, ''),
    email_change_token_new     = coalesce(email_change_token_new, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    phone_change               = coalesce(phone_change, ''),
    phone_change_token         = coalesce(phone_change_token, ''),
    reauthentication_token     = coalesce(reauthentication_token, '')
where id::text like 'a0000000-0000-0000-0000-%';

-- 관리자 승격 (트리거는 기본 'student'로 생성)
update public.profiles set role = 'admin' where id = 'a0000000-0000-0000-0000-000000000001';

-- 이메일 로그인용 identities (email 컬럼은 generated이므로 삽입 대상에서 제외).
-- 이게 있어야 GoTrue 이메일+비밀번호 로그인이 동작한다.
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  u.id::text,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
  'email',
  now(), now(), now()
from auth.users u
where u.id in (
  'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005'
)
and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');

-- -----------------------------------------------------------------------------
-- 6. reviews (REVIEWS_DATA) — 테스트 계정과 연결
-- -----------------------------------------------------------------------------
insert into public.reviews (user_id, course_id, rating, content, created_at) values
  ('a0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 5,
   '대만 유학가기 전에 항상 디저트 공부하면서 애태웠던 머랭 조절을 이 강의로 완전 극복했어요! 꼬끄 밑면이 비는 현상(할로우)이 왜 일어나는지 정확한 이론으로 설명해주셔서 너무 통쾌합니다.', '2026-05-28'),
  ('a0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 5,
   '我在台北親自參加過謝芙的實體課，沒想到VOD影片解析度這麼高，甚至比在現場看還清晰！烤箱控溫的段落講解特別細緻，非常推薦給想要追求法式經典口感的烘焙愛好者！', '2026-05-15'),
  ('a0000000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 4,
   '카페 사이드 베이킹용으로 주문해서 수강중입니다. 손님들이 휘낭시에 먹어보더니 겉바속촉이 수준급이라고 칭찬하네요. 탄버터 거르는 팁 덕분에 구움색이 예쁜 카라멜 빛깔로 구워집니다.', '2026-06-01'),
  ('a0000000-0000-0000-0000-000000000005', '33333333-3333-3333-3333-333333333333', 5,
   '상급이라 확실히 정교한 계산과 감각이 많이 요구됩니다. 폰사주 할 때 매번 모서리가 찢어지던 설움이 싹 들어갔어요. 생또노레 카라멜 코팅 팁 최고입니다!', '2026-06-07');
