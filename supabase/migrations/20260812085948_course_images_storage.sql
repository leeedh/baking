-- =============================================================================
-- 클래스 커버 이미지 Storage 기반 (course-images 공개 버킷)
--
-- 목적: 운영자가 온라인 클래스 목록/상세에 쓰일 썸네일을 직접 업로드한다.
--       (그전까지 courses.thumbnail_url에는 seed의 외부 URL만 있었고 업로드 경로가 없었다.)
--
-- ⚠️ storage.objects에 쓰기 정책을 의도적으로 두지 않는다 — course-materials와 같은 방침.
--    업로드는 service_role 라우트(POST /api/admin/courses/[id]/thumbnail) 독점이고,
--    읽기만 public 버킷으로 열어 카탈로그가 서명 없이 이미지를 표시할 수 있게 한다.
--    (자료 PDF와 달리 썸네일은 비로그인 방문자에게도 보여야 하므로 public=true다.)
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-images',
  'course-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
