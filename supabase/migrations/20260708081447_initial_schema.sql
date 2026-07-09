-- =============================================================================
-- DB-MIG-01 · Initial schema (DBSchema v1.0 §2)
-- 10 tables + enum(text+CHECK) + indexes. RLS/함수/트리거/뷰는 후속 마이그레이션.
-- 다국어 텍스트는 jsonb {"ko":"...","en":"..."} (PRD-F-01). 통화는 KRW 단일(TS-ADR-05).
-- =============================================================================

-- DB-T-01 · profiles (auth.users 확장 + role)
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  role         text        not null default 'student' check (role in ('student','admin')),
  locale       text        not null default 'ko'      check (locale in ('ko','en','zh-CN')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- DB-T-02 · courses (판매 단위 클래스)
create table public.courses (
  id               uuid primary key default gen_random_uuid(),
  slug             text        not null unique,
  title            jsonb       not null default '{}',
  description      jsonb       not null default '{}',
  thumbnail_url    text,
  price_krw        integer     not null default 0 check (price_krw >= 0),
  list_price_krw   integer,                                   -- 정가(취소선·할인율 표시용)
  currency         text        not null default 'KRW' check (currency in ('KRW')),
  status           text        not null default 'draft' check (status in ('draft','published')),
  category         text,                                      -- 카탈로그 필터 탭
  level            text        check (level in ('초급','중급','상급')), -- 난이도 배지(course_level)
  tags             text[]      not null default '{}',
  instructor_title jsonb       not null default '{}',         -- i18n 강사 직함(단일 브랜드)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_courses_status on public.courses(status);  -- DB-IDX-03

-- DB-T-03 · lessons (차시 = Mux 영상 1개, 영상 접근 보안 핵심)
create table public.lessons (
  id               uuid primary key default gen_random_uuid(),
  course_id        uuid        not null references public.courses(id) on delete cascade,
  title            jsonb       not null default '{}',
  chapter_index    integer     not null default 1,            -- 커리큘럼 그룹핑(비정규화)
  chapter_title    jsonb       not null default '{}',
  mux_asset_id     text,
  mux_playback_id  text,                                      -- 서명 재생 대상(EPIC-E 전까지 NULL)
  order_index      integer     not null default 0,
  duration_sec     integer,
  is_preview       boolean     not null default false,        -- 비구매자 미리보기 허용
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint lessons_order_uk unique (course_id, order_index) -- DB-IDX-04
);

-- DB-T-04 · materials (차시별 레시피/재료 PDF, Storage 경로)
create table public.materials (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    uuid        not null references public.lessons(id) on delete cascade,
  title        jsonb       not null default '{}',
  storage_path text        not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_materials_lesson on public.materials(lesson_id);  -- DB-IDX-05

-- DB-T-05 · orders (결제 트랜잭션, 수강권과 분리)
create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  course_id      uuid        not null references public.courses(id)  on delete restrict,
  amount_krw     integer     not null check (amount_krw >= 0),
  currency       text        not null default 'KRW',
  status         text        not null default 'pending'
                   check (status in ('pending','paid','failed','canceled','refunded')),
  payment_key    text        unique,                          -- TossPayments paymentKey(멱등)
  payment_method text,
  paid_at        timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_orders_user   on public.orders(user_id);    -- DB-IDX-06
create index idx_orders_course on public.orders(course_id);  -- DB-IDX-07
create index idx_orders_status on public.orders(status);     -- DB-IDX-09

-- DB-T-06 · enrollments (영구 수강권, 만료 없음)
create table public.enrollments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  course_id  uuid        not null references public.courses(id)  on delete restrict,
  order_id   uuid        not null references public.orders(id)   on delete restrict,
  status     text        not null default 'active' check (status in ('active','refunded')),
  granted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enrollments_order_uk       unique (order_id),            -- 주문당 1수강권(멱등)
  constraint enrollments_user_course_uk unique (user_id, course_id)   -- 단건: 사용자-클래스 1수강권
);
create index idx_enrollments_course on public.enrollments(course_id);  -- DB-IDX-11

-- DB-T-07 · progress (차시별 시청 진도, created_at 없이 updated_at만)
create table public.progress (
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  lesson_id   uuid        not null references public.lessons(id)  on delete cascade,
  watched_sec integer     not null default 0 check (watched_sec >= 0),
  completed   boolean     not null default false,
  updated_at  timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index idx_progress_lesson on public.progress(lesson_id);  -- DB-IDX-14

-- DB-T-08 · reviews (수강자 작성, 공개 읽기, 클래스당 1건)
create table public.reviews (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  course_id  uuid        not null references public.courses(id)  on delete cascade,
  rating     integer     not null check (rating between 1 and 5),
  content    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_user_course_uk unique (user_id, course_id)
);
create index idx_reviews_course on public.reviews(course_id);  -- DB-IDX-15

-- DB-T-09 · coupons (서버 측 할인 계산 근거, 클라 계산은 표시용)
create table public.coupons (
  code            text primary key,                          -- 대문자 정규화
  discount_type   text        not null default 'fixed' check (discount_type in ('fixed','percent')),
  discount_value  integer     not null check (discount_value >= 0),
  is_active       boolean     not null default true,
  starts_at       timestamptz,
  expires_at      timestamptz,
  max_redemptions integer,
  redeemed_count  integer     not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- DB-T-10 · books (도서 상품, 구매는 외부 커머스로 위임 — orders/enrollments 미연결)
create table public.books (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text        not null unique,
  title                 jsonb       not null default '{}',
  subtitle              jsonb       not null default '{}',
  description           jsonb       not null default '{}',
  thumbnail_url         text,
  price_krw             integer,                              -- 참고 표시가(청구 아님)
  list_price_krw        integer,
  chapters              jsonb       not null default '[]',
  external_purchase_url text        not null,                 -- 네이버쇼핑/쿠팡 등
  status                text        not null default 'draft' check (status in ('draft','published')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
