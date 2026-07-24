-- =============================================================================
-- DC-47 · 차시 순서 변경 원자적 처리 (reorder_lessons)
--
-- lessons에 unique(course_id, order_index) 제약이 있어 순서를 부분 갱신하면 중간 상태에서
-- 유니크 충돌이 난다. 전체를 음수로 임시 이동(서로 distinct 유지) 후 1..N으로 재배치해
-- 한 트랜잭션 안에서 충돌 없이 순서를 확정한다.
--
-- SECURITY DEFINER + is_admin() 가드: 운영자만 실행. p_ids는 해당 course의 전체 lesson id를
-- 원하는 순서대로 담은 배열이어야 한다(누락/외부 id는 무시되어 순서만 재부여).
-- =============================================================================
create or replace function public.reorder_lessons(p_course_id uuid, p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  i integer;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- 임시로 음수 이동(서로 distinct → 유니크 충돌 회피).
  update public.lessons
     set order_index = -order_index - 1
   where course_id = p_course_id;

  -- 배열 순서대로 1..N 재부여.
  for i in 1 .. coalesce(array_length(p_ids, 1), 0) loop
    update public.lessons
       set order_index = i, updated_at = now()
     where id = p_ids[i] and course_id = p_course_id;
  end loop;
end;
$$;

revoke all on function public.reorder_lessons(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_lessons(uuid, uuid[]) to authenticated;
