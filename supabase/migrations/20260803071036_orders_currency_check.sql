-- =============================================================================
-- DB-MIG-12 · 코드리뷰 L-7 · orders.currency에 KRW 체크 제약
--
-- courses.currency에는 `check (currency in ('KRW'))`가 있는데(initial_schema.sql:27)
-- orders에만 빠져 있어(:72) 통화가 혼입돼도 DB가 막지 않았다. 정산은 KRW 단일
-- 전제로 짜여 있으므로(TS-ADR-05) 스키마가 그 전제를 강제하게 한다.
--
-- 적용 시점의 기존 4행은 전부 KRW라 데이터 정리 없이 붙는다.
-- =============================================================================

alter table public.orders
  add constraint orders_currency_check check (currency in ('KRW'));
