-- =============================================================================
-- 진행 중인 Mux Direct Upload를 차시에 기록한다.
--
-- 이유: 인코딩 완료 감지가 웹훅이 아니라 클라이언트 폴링이다. 운영자가 업로드 도중
--       화면을 떠나면 폴링이 끊기고, 돌아왔을 때 "그 업로드가 어떻게 됐는지" 알 방법이
--       전혀 없었다(uploadId가 브라우저 메모리에만 있었다). 영상 여러 개를 한 번에
--       올리는 편집기에서는 이 구멍이 훨씬 자주 드러난다.
--
--       업로드 생성 시 이 컬럼에 기록하고, ready로 확정되는 순간 null로 지운다.
--       따라서 "mux_upload_id is not null and mux_playback_id is null" = 아직 처리 중.
-- =============================================================================

alter table public.lessons
  add column if not exists mux_upload_id text;

comment on column public.lessons.mux_upload_id is
  '진행 중인 Mux Direct Upload ID. 인코딩 완료(ready) 시 null로 지운다 — 편집기 재진입 시 폴링 재개용.';
