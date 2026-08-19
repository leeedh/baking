-- DC-111 · 인코딩 실패 사유를 차시에 남긴다.
--
-- 지금까지 실패 사유는 브라우저 폴링의 **응답**으로만 전달됐다. 웹훅으로 통보를 받는
-- 순간에는 그 응답을 볼 브라우저가 없을 수 있으므로(운영자가 편집기를 떠난 뒤 실패),
-- 사유가 갈 곳이 필요하다. 이 컬럼이 그 자리다.
--
-- 성공적으로 영상이 연결되면 NULL로 지운다 — 재업로드가 성공했는데 옛 오류가 남아
-- 운영자를 헷갈리게 하면 안 된다.
alter table public.lessons
  add column if not exists mux_error text;

comment on column public.lessons.mux_error is
  'Mux 인코딩 실패 사유(운영자 표시용). 영상이 정상 연결되면 NULL로 지운다. DC-111.';
