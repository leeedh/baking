-- DB-MIG-10 · DC-97 (PRD-F-21) · 1:1 비공개 문의(DB-T-11)
--
-- 작성자·운영자만 열람한다. service_role은 RLS를 우회하므로 RLS는 단독 게이트가 아니라
-- backstop이고, 쓰기는 requireAdmin/세션 가드를 통과한 라우트(TS-API-14/15)를 경유한다.

create type public.inquiry_status as enum ('open', 'answered', 'closed');

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null default '기타',
  subject text not null,
  body text not null,
  status public.inquiry_status not null default 'open',
  answer_body text,
  answered_by uuid references public.profiles(id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.inquiries is 'DB-T-11 · 1:1 비공개 문의(PRD-F-21). 작성자·운영자만 열람.';

-- 작성자 문의 목록 / 운영자 미답변 큐
create index inquiries_user_created_idx on public.inquiries (user_id, created_at desc);
create index inquiries_status_idx on public.inquiries (status);

-- DB-TRG-AU 재사용
create trigger set_inquiries_updated_at
  before update on public.inquiries
  for each row execute function public.set_updated_at();

alter table public.inquiries enable row level security;

-- 작성자 본인 또는 운영자만 열람(비공개)
create policy "inquiries_select_own" on public.inquiries
  for select using (user_id = (select auth.uid()) or public.is_admin());

-- 로그인 회원이 자기 명의로만 작성
create policy "inquiries_insert_own" on public.inquiries
  for insert with check (user_id = (select auth.uid()));

-- 답변·상태 전이는 운영자만
create policy "inquiries_update_admin" on public.inquiries
  for update using (public.is_admin()) with check (public.is_admin());
