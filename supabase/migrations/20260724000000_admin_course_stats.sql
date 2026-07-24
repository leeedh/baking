-- =============================================================================
-- DC-50 · 운영자 대시보드 실집계 (admin_course_stats)
--
-- 목적: admin 콘솔 KPI·클래스 테이블을 실데이터로 연동한다.
--       기존 admin_course_sales(매출·수강생)에 단가·강사직함·판매수량·완주율을 더한다.
--
-- 완주율 정의(제품 결정): active 수강권별 (완료 차시 ÷ 전체 차시)의 평균.
--
-- ⚠️ progress는 owner-only RLS(progress_all_own)라 security_invoker=on 뷰로는 운영자가
--    타인 진도를 읽지 못한다. orders/enrollments와 동일하게 admin read 정책을 추가해
--    invoker 권한(운영자)으로 전체 집계가 가능하도록 한다. 비운영자에겐 여전히 owner-only.
--
-- 팬아웃(카테시안 곱) 방지: 각 지표를 독립 스칼라 서브쿼리로 산출(admin_course_sales 패턴).
-- =============================================================================

-- 운영자 전체 진도 읽기 (완주율 집계용). 비운영자는 기존 owner-only 정책만 적용.
create policy "progress_select_admin" on public.progress
  for select using (public.is_admin());

create or replace view public.admin_course_stats
with (security_invoker = on) as
  select
    c.id              as course_id,
    c.title,
    c.instructor_title,
    c.price_krw,
    c.list_price_krw,
    c.status,
    (select count(*) from public.orders o
       where o.course_id = c.id and o.status = 'paid')                          as sales_count,
    coalesce((select sum(o.amount_krw) from public.orders o
       where o.course_id = c.id and o.status = 'paid'), 0)                       as gross_krw,
    (select count(*) from public.enrollments e
       where e.course_id = c.id and e.status = 'active')                         as active_enrollments,
    -- active 수강권별 (완료 차시/전체 차시)의 평균. 전체 차시 0이면 0. 결과는 0~1 비율.
    coalesce((
      select avg(
        case when lc.total = 0 then 0
             else (
               select count(*)
               from public.progress p
               join public.lessons l on l.id = p.lesson_id
               where l.course_id = c.id and p.user_id = e.user_id and p.completed
             )::numeric / lc.total
        end
      )
      from public.enrollments e
      cross join (select count(*) as total from public.lessons where course_id = c.id) lc
      where e.course_id = c.id and e.status = 'active'
    ), 0) as avg_completion
  from public.courses c;
