-- =============================================================================
-- DC-58 · 학습 자료 Storage 기반 (course-materials 비공개 버킷)
--
-- 목적: 차시별 레시피 PDF를 수강권 보유자에게만 단기 서명 URL로 제공한다.
--
-- ⚠️ storage.objects에 anon/authenticated 정책을 의도적으로 두지 않는다.
--    업로드(운영자)와 서명 URL 발급(수강생) 모두 service_role 라우트를 경유하므로
--    "정책 부재 = 기본 차단"이 그 자체로 방어선이다. 클라이언트가 버킷을 직접
--    조회·다운로드할 경로는 존재하지 않는다.
--    실제 권한 판정은 public.materials의 RLS(materials_select_enrolled)와
--    has_course_access()가 담당한다(자료 다운로드 API의 이중 방어).
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-materials', 'course-materials', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

-- 다운로드 UI 표기(파일 크기)와 업로드 검증 이력 보존용 메타.
alter table public.materials
  add column if not exists size_bytes integer,
  add column if not exists mime_type  text;
