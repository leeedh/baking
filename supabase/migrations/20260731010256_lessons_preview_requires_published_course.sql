-- =============================================================================
-- DB-MIG-07 · 코드리뷰 H-4 · draft 강좌의 미리보기 차시 노출 차단
--
-- lessons_select_guarded는 is_preview만 보고 부모 강좌의 공개 여부를 확인하지 않아,
-- courses는 status='published'로 막혀 있는데 차시만 새는 비대칭이 있었다.
-- anon이 미공개 강좌의 차시 제목·순서·mux_playback_id를 읽을 수 있었다.
--
-- 미리보기 분기에만 published 조건을 더한다. 수강권(has_course_access)·관리자(is_admin)
-- 분기는 그대로 — 구매자와 운영자는 준비 중인 강좌도 계속 볼 수 있어야 한다.
-- =============================================================================

alter policy "lessons_select_guarded" on public.lessons
  using (
    (
      is_preview = true
      and exists (
        select 1 from public.courses c
        where c.id = lessons.course_id and c.status = 'published'
      )
    )
    or public.has_course_access(course_id)
    or (select public.is_admin())
  );
