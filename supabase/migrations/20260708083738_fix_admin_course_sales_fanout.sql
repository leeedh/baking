-- =============================================================================
-- DB-MIG-05 · admin_course_sales 팬아웃 버그 수정
--
-- 문제: DBSchema §4.3 원본 뷰는 courses에 orders와 enrollments를 동시에 LEFT JOIN한다.
--       코스당 (주문 수 × 수강권 수)의 카테시안 곱이 생겨, gross_krw(=sum(orders.amount))가
--       수강권 수만큼 부풀려진다. (active_enrollments는 count(distinct)라 안전)
--       실증: 주문 2건×수강권 2건 → gross 756,000 (정답 378,000).
--
-- 수정: 팬아웃이 없는 스칼라 서브쿼리로 각 지표를 독립 집계 (course_catalog와 동일 패턴).
--       security_invoker=on 유지 → orders/enrollments RLS로 운영자만 전체 집계 열람.
-- =============================================================================
create or replace view public.admin_course_sales
with (security_invoker = on) as
  select
    c.id as course_id,
    c.title,
    (select count(*) from public.enrollments e
       where e.course_id = c.id and e.status = 'active')                      as active_enrollments,
    coalesce((select sum(o.amount_krw) from public.orders o
       where o.course_id = c.id and o.status = 'paid'), 0)                     as gross_krw
  from public.courses c;
