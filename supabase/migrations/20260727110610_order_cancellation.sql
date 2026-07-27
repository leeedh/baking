-- DC-34 · 주문 취소(환불) 추적 컬럼.
-- 운영자 환불 실행 시 PG 취소 결과·사유를 주문 행에 기록한다(하드 삭제 없이 이력 보존).
-- 모두 nullable — 기존 행에 영향 없음. 운영자 쓰기는 service_role 라우트를 경유하므로
-- RLS 정책 변경은 불필요하다.
alter table public.orders
  add column if not exists canceled_at       timestamptz,
  add column if not exists cancel_reason     text,
  add column if not exists cancel_amount_krw integer check (cancel_amount_krw is null or cancel_amount_krw >= 0),
  add column if not exists cancel_key        text;  -- Toss 취소 트랜잭션 식별자(transactionKey)
