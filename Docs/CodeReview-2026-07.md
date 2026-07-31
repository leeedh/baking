# 전체 코드 리뷰 보고서 (2026-07-30)

> **2026-07-31 수정 반영 완료** — Critical 2건, High 6건, 횡단 X-1·X-2·X-3·X-5를 처리했다.
> 처리 내역은 문서 맨 아래 [§8 수정 반영](#8-수정-반영-2026-07-31) 참조.
> 남은 항목(M-2~M-13, L-2~L-7, X-4)은 Jira DC 티켓으로 적재한다.

Codex(`gpt-5.3-codex`, 읽기 전용)로 코드베이스 전체를 8개 배치로 나눠 리뷰하고,
각 findings를 코드로 직접 대조해 **CONFIRMED / PLAUSIBLE / REJECTED**로 판정한 결과다.

- 대상: `src/` + `supabase/` — 136 파일 / 약 13,300줄
- 방식: `codex task`(경로 스코프 읽기 전용 리뷰) 7배치 + `codex adversarial-review`(설계 도전) 1배치
- 원문 Codex 출력은 리포에 커밋하지 않음(세션 scratchpad 보관)
- **수정은 이 보고서 승인 이후 별도로 진행한다** — 이 문서 작성 시점의 워킹트리는 clean

판정 요약: CONFIRMED 26 · PLAUSIBLE 2 · REJECTED 4

---

## 1. 즉시 조치 (Critical)

### C-1 · 일반 회원의 관리자 자가 승격 — `profiles.role`
`supabase/migrations/20260708081533_rls_policies.sql:12`,
`20260708082444_security_hardening.sql:24`

`profiles_update_self`는 `using/with check (id = auth.uid())`뿐이고 **컬럼 제한이 없다**.
마이그레이션 어디에도 `role`에 대한 컬럼 GRANT 회수나 차단 트리거가 없다
(정책 주석은 "role 변경은 서버/관리자만"이라 적혀 있으나 강제되지 않음).

**공격**: 로그인 회원이 `PATCH /rest/v1/profiles?id=eq.<self>` 로 `{"role":"admin"}` 전송
→ `is_admin()`이 즉시 참 → courses/lessons/materials/coupons의 `*_admin_modify` 정책 통과.
앱 레이어 `requireAdmin()`도 같은 `profiles.role`을 보므로 **관리자 콘솔 API까지 함께 열린다**.
이중 방어가 같은 컬럼을 보고 있어 두 겹이 동시에 무너지는 구조다.

**수정 방향**: `role` 변경을 DB에서 봉쇄(컬럼 UPDATE 권한 회수 또는 BEFORE UPDATE 트리거로
`new.role = old.role` 강제), 승격은 service_role 전용 경로로만.

### C-2 · 취소·환불된 주문에 수강권이 발급될 수 있음
`src/lib/payments/orders.ts:23-58`

`didTransition`은 쿠폰 증가에만 쓰이고 **`grant_enrollment`는 무조건 실행된다**(`:51`).
① 취소 webhook/운영자 환불이 주문을 `canceled/refunded`로 전이 →
② stale `order`를 든 confirm 또는 DONE webhook이 `completePaidOrder` 진입 →
③ `:23` update는 0행(가드에 걸림)이지만 ④ `:51` grant는 실행 →
**취소된 주문 뒤에 active 수강권이 남는다.** `refundOrder`의 회수는 `order_id` 기준이라
회수 시점에 수강권이 없었으면 0행으로 끝나 사후 회수도 되지 않는다.

**수정 방향**: `didTransition === false`면 DB 상태를 재조회해 `paid`가 아닐 때 발급 중단.
근본적으로는 상태 전이 + 발급을 하나의 Postgres RPC 트랜잭션(`select ... for update`)으로.

---

## 2. 높은 우선순위 (High)

### H-1 · 이중 청구 — 단건 구매를 DB가 강제하지 않음
`api/payments/create-order/route.ts:48-92`, `api/payments/confirm/route.ts:64-85`

`orders(user_id, course_id)`에 pending/paid 부분 유니크 인덱스가 없어 같은 강좌의 pending 주문
2건이 공존할 수 있다. confirm의 활성 수강권 확인(`:64`)과 Toss capture(`:85`) 사이에 잠금이
없어 두 요청이 모두 통과 → **둘 다 청구**. 이후 `grant_enrollment`의
`on conflict (user_id, course_id) do update set order_id = excluded.order_id`
(`20260727153213`)가 기존 수강권을 나중 주문으로 재연결하므로 **에러 없이 조용히 성공**하고,
먼저 결제된 주문은 `paid`인데 대응 수강권이 없어 환불해도 접근권이 회수되지 않는다.

**수정 방향**: 부분 유니크 인덱스로 중복 pending/paid 주문 차단 + confirm을 주문 행 잠금 안에서.

### H-2 · 쿠폰 한도가 결제 확정 시점에 보장되지 않음
`supabase/migrations/20260710042909_coupon_redemption_fn.sql:4-11`, `lib/payments/orders.ts:41-47`

`increment_coupon_redemption`은 `returns void`이고 조건부 update만 한다. 0행이어도 호출부가
알 수 없고(`error`만 로깅), 발급을 막지도 않는다. 마지막 재고를 동시에 검증한 주문들이
모두 할인가로 청구되고 전원 수강권을 받는다 → **정산 손실이 조용히 발생**.

**수정 방향**: 함수가 성공 여부를 반환하도록 바꾸고, 실패 시 confirm 전 차단 또는 보상 처리.

### H-3 · `PARTIAL_CANCELED`를 전액 환불로 처리
`api/payments/webhook/route.ts:61`, `lib/payments/orders.ts:88-111`

부분 취소 webhook이 `CANCELED`와 같은 분기로 들어가 주문을 `refunded`,
`cancel_amount_krw`를 부분액으로 기록하고 **수강권까지 회수**한다. 누적 취소금액 개념이 없다.

### H-4 · draft 강좌의 preview 차시가 anon에 노출
`supabase/migrations/20260708081533_rls_policies.sql:27-32`

`lessons_select_guarded`가 `is_preview = true`만 보고 부모 course의 `status`를 확인하지 않는다.
`courses`는 `status='published'`로 막혀 있는데 차시만 새는 비대칭 —
미공개 강좌의 차시 제목·순서·`mux_playback_id`가 읽힌다.

### H-5 · 로그인 폼에 시드 관리자 계정이 프리필됨
`src/components/LoginScreen.tsx:32-34`

`useState('admin@ateliercreme.com')` / `useState('password123')`.
배포 화면을 연 누구나 관리자 자격증명을 보고 그대로 엔터를 칠 수 있다.
`supabase/seed.sql:14-20,47`이 **정확히 같은 계정을 admin으로 생성**하므로,
seed가 적용된 환경에서는 즉시 관리자 탈취다. 개발 편의용 프리필이 배포 코드에 남은 것.

### H-6 · `seed.sql`의 고정 비밀번호 관리자 계정
`supabase/seed.sql:14-20`, `:47`

파일 상단에 "로컬 전용" 주석은 있으나, 원격 적용을 MCP `execute_sql`로 하는 운영 방식과
맞물려 실수 여지가 있다. 계정 시드를 별도 로컬 전용 파일로 분리 권장.

---

## 3. 횡단 이슈 — 개별 파일보다 이쪽이 본질

### X-1 · `assertSameOrigin` 누락이 admin 라우트에만 몰려 있음 (Medium)
규약은 이미 정착돼 있는데(payments·materials·inquiries·refund·progress·reviews·playback 전부 적용)
**admin 상태 변경 라우트 7개만 빠졌다**:

| 라우트 | 메서드 |
|---|---|
| `admin/courses/route.ts` | POST |
| `admin/courses/[id]/route.ts` | PATCH |
| `admin/lessons/route.ts` | POST |
| `admin/lessons/[id]/route.ts` | PATCH · DELETE |
| `admin/lessons/reorder/route.ts` | POST |
| `admin/mux/upload/route.ts` | POST |
| `admin/mux/upload/status/route.ts` | POST |

한 번에 일괄 추가할 성질의 것. (참고: `lib/api/origin.ts:25,30`은 scheme을 비교하지 않고
host만 본다 — 함께 손보면 좋다.)

### X-2 · Supabase `error`를 버리고 `data ?? []`로 삼키는 패턴 (Medium)
`catalog.ts:91,151`, `inquiries.ts:40,54`, `admin.ts:63`, `lessons.ts:101`, `materials.ts:27` …
데이터 접근 함수 대부분이 `const { data } = await ...` 형태다.
DB 장애·정책 변경으로 조회가 실패해도 화면은 "데이터 없음"으로 정상 렌더되고,
`getLearnPageData()`는 `purchased:false`로 떨어져 **구매자가 접근 거부 화면을 본다**.
운영자가 감지할 신호도 남지 않는다. 진짜 no-row와 조회 실패를 분리해야 한다.

### X-3 · 비동기 mutation에 `try/catch/finally` 부재 → UI 영구 잠금 (Medium)
`DashboardScreen.tsx:115` 이하(`savePriceEdit`·`toggleStatus`·`handleCreateClass`·`handleRefund`),
`LessonManager.tsx:205` 이하(자료 업로드/삭제/수정/순서변경).
fetch가 throw하면 `setBusy(false)`에 도달하지 못해 운영자 화면이 "처리 중"으로 고착된다.

### X-4 · 주요 화면이 i18n 메시지를 쓰지 않고 한국어 하드코딩 (Medium)
`DetailScreen.tsx:95`, `InquiriesScreen.tsx:69`, `MyClassesScreen.tsx:34`,
`PlayerScreen.tsx:70,127`(`alert()` 문구 포함).
`messages/{ko,en}.json`의 **키 집합 자체는 일치**하지만, 화면이 키를 아예 참조하지 않아
`/en` 경로에서 한국어가 그대로 나온다. 키 누락 검사로는 잡히지 않는 종류의 결함.

### X-5 · 불변식을 지킬 자동 테스트가 전무 (Medium, 구조적)
`package.json`에 `test` 스크립트 없음, 테스트 파일 없음. 이 리뷰에서 나온 결제·RLS 결함은
**전부 수동 happy path로는 발견되지 않는 종류**다. 설계가 앱 코드의 실행 순서에 의존하는데
그 순서를 검증하는 장치가 없다는 것이 가장 구조적인 지적.
최소 검증 대상: 결제 상태 전이표 · confirm/webhook 동시성 · 환불 후 접근 차단 ·
쿠폰 `max_redemptions` · RLS owner/admin 접근.

---

## 4. 그 외 확인된 결함 (Medium / Low)

| ID | 심각도 | 위치 | 내용 |
|---|---|---|---|
| M-1 | Medium | `lib/payments/orders.ts:88` | `refundOrder`가 stale `order.status`로 `nextStatus`를 정하는데 update 가드는 `paid/pending/failed` 전체 허용 → paid 주문이 `canceled`로 잘못 기록될 수 있음 |
| M-2 | Medium | `20260708082444:39` | `reviews_modify_own` UPDATE에 `has_course_access` 미적용 → 미수강 강좌로 리뷰 이동 가능 |
| M-3 | Medium | `20260729060000_inquiries.sql:40` | 문의 INSERT가 `status`/`answer_body`/`answered_by` 주입을 막지 않음(PostgREST 직접 호출 시) |
| M-4 | Medium | `rls_policies.sql:9` | `profiles_select_public`이 전체 프로필과 `role`을 anon에 공개 → C-1의 표적 선정이 쉬워짐 |
| M-5 | Medium | `lib/mux/client.ts:86` | signed playback ID가 없으면 public ID로 fallback 저장 → JWT 없이 재생 가능해짐 |
| M-6 | Medium | `api/progress/route.ts:9-13,57-60` | `watchedSec`·`completed`를 클라이언트 값 그대로 신뢰하며 **sticky**(되돌릴 경로 없음) |
| M-7 | Medium | `PlayerScreen.tsx:79-90` | 완강 처리 낙관적 UI가 서버 실패를 빈 catch로 삼킴 → 새로고침하면 사라짐 |
| M-8 | Medium | `LessonManager.tsx:144` | Mux 업로드 폴링에 abort/cleanup 없음 → 이탈 후 약 5분간 계속 폴링, 언마운트 후 setState |
| M-9 | Medium | `DetailScreen.tsx:55`, `MyClassesScreen.tsx:24` | 카탈로그 이동이 `/`로 감 — 정보구조상 목록 본체는 `/classes`(DC-96 재구조화 잔재) |
| M-10 | Medium | `PlayerScreen.tsx:49-53` | `?lesson=`을 `useState` 초기값으로만 반영 → 뒤로/앞으로 시 URL과 재생 차시 불일치 |
| M-11 | Medium | `app/global-error.tsx:10` | `reset` prop을 받지 않아 같은 경로 재시도 불가(`[locale]/error.tsx`는 이미 적용) |
| M-12 | Medium | `lib/books.ts` ↔ `books` 테이블 | 도서 정본 이원화 — 앱은 정적 상수만 읽는데 public-readable 테이블·seed가 살아 있어 드리프트 |
| M-13 | Medium | `inquiries.ts:40,54`, `catalog.ts:240` | 페이지네이션 없는 전량 조회(운영자 문의 큐는 JS에서 정렬까지) |
| L-1 | Low | `lib/api/origin.ts:25,30` | Origin 비교가 host만 보고 scheme 무시 |
| L-2 | Low | 다수 admin 라우트 | 내부/공급자 에러 메시지를 Problem `detail`로 그대로 반환 |
| L-3 | Low | `catalog.ts:154-158` | 완료 진도 전량 조회 후 대부분 폐기 — `courseIds`로 범위 제한 필요 |
| L-4 | Low | `api/progress/route.ts:35-47` | 재생 토큰 라우트와 달리 RLS 단독 방어(H-4와 결합 시 실제 구멍) |
| L-5 | Low | `skeletons/PageSkeleton.tsx:24` | `aria-busy`/`sr-only` 로딩 텍스트 없음 |
| L-6 | Low | `sections/ChefBanner.tsx:9` | 이 섹션만 `aria-labelledby` 누락(커밋 de313cb의 누락분) |
| L-7 | Low | `initial_schema.sql:72` | `orders.currency`에 `KRW` 체크 제약 없음(`courses`에는 있음) |
| L-8 | Low | `inquiries.ts:7-8` | 파일 주석("소유자 필터를 중복하지 않는다")이 `:43`의 실제 코드와 어긋남 |

---

## 5. REJECTED — 지적됐으나 결함이 아닌 것

| Codex 지적 | 판정 사유 |
|---|---|
| `checkout/[id]`·`learn/[id]`·`admin/courses/[id]`의 `loading.tsx`가 soft-404를 유발 (High ×3) | **문서화된 의도적 결정**. 셋 다 인증 뒤라 색인 대상이 아니어서 스켈레톤을 유지하고 200을 감수하기로 한 것(`Docs/UXGuide.md` §8.6, CLAUDE.md). 정작 중요한 `classes/[id]`에는 `loading.tsx`가 없고 홈·목록은 라우트 그룹으로 격리돼 있어 **DC 재구조화가 유지되고 있음이 확인됐다** |
| 비전이자의 `grant_enrollment` 호출이 중복 발급 에러를 낸다 (Medium) | `grant_enrollment`는 `order_id` 선조회 + `on conflict`라 에러가 나지 않는다. 다만 **같은 코드 위치의 진짜 문제는 C-2**(조용한 무단 발급)로 재기술 |
| `getMyInquiries`의 소유자 필터 중복이 관리자 조회를 망친다 (Low) | 본인 목록(`getMyInquiries`)과 운영자 큐(`getAdminInquiries`)가 함수로 분리돼 있고 운영자 경로는 필터 없는 쪽을 쓴다. 동작 결함 없음 — 주석만 정정(L-8) |

---

## 6. 확인된 정상 항목 (회귀 방지용 기록)

- **결제**: 금액 서버 재도출, 이미 `paid`면 멱등 성공, 결정적 4xx만 `failed`·5xx/timeout은 pending 유지,
  `completePaidOrder`의 `.in().select()` 단일 전이자 판별과 쿠폰 증가 결속, webhook의 paymentKey 재조회·금액 재검증
- **인가**: `createAdminClient()`를 쓰는 admin 라우트 **10개 전부** `requireAdmin()` 호출(누락 0),
  `requireAdmin`은 401/403 fail-closed, `AuthProvider.isAdmin`은 UI 전용
- **DB**: 테이블 11개 전부 RLS 활성, SECURITY DEFINER 함수 전부 `set search_path` 고정,
  `grant_enrollment`/`handle_new_user`/`increment_coupon_redemption`의 anon·authenticated EXECUTE 회수,
  `enrollments`의 `order_id` · `(user_id, course_id)` 유니크, `database.types.ts` 최신 반영
- **재생**: `playback/token`은 RLS 조회 + `has_course_access` 재확인의 **이중 방어가 실제로 구현됨**,
  TTL은 `duration*3`을 [1h, 2h]로 clamp(비정상 입력으로 늘릴 수 없음), Mux 503은 인증 검사 **이후**
- **라우팅/i18n**: `ko.json`/`en.json` 키 집합 일치, `next/link` 직접 사용 없음,
  `useRevealOnScroll`의 Observer cleanup·SSR 안전성, `Modal`의 `aria-modal`·Esc·포커스 복원·트랩

---

## 7. 권장 처리 순서

1. **C-1**(role 자가 승격) — 다른 모든 인가 방어를 무력화하므로 최우선
2. **C-2 · H-1 · H-2 · H-3 · M-1** — 결제·수강권 불변식. 개별 패치보다 **상태 전이를 DB RPC + 행 잠금으로 통합**하는 편이 근본적
3. **H-5 · H-6** — 프리필 제거와 seed 분리. 변경량이 작고 위험이 커서 2번과 병행 가능
4. **H-4 · M-2 · M-3 · M-4** — RLS 정책 보강(마이그레이션 1건으로 묶을 수 있음)
5. **X-1 · X-2 · X-3** — 횡단 일괄 수정
6. **X-5** — 위 수정의 회귀 방지 테스트. 이상적으로는 2번보다 **먼저** 최소 테스트 하네스를 세우는 것이 낫다
7. 나머지 Medium/Low는 Jira DC 티켓으로 적재

---

## 8. 수정 반영 (2026-07-31)

브랜치 `fix/code-review-2026-07`, 커밋 8건. 원격 DB(`sowoo`)에 마이그레이션 3건 적용 완료.

| 항목 | 처리 | 위치 |
|---|---|---|
| C-1 | 테이블 UPDATE 권한 회수 + 사용 가능 컬럼만 재부여, `protect_profile_role()` 트리거 | `20260731010206_protect_profile_role.sql` |
| C-2 | `grant_enrollment`가 주문을 잠그고 `status='paid'` + 인자 일치를 강제 | `20260731010430_payment_invariants_in_db.sql` |
| H-1 | `orders(user_id, course_id)` partial unique index + `open_pending_order()` 원자화 | 〃 / `api/payments/create-order` |
| H-2 | 쿠폰 예약을 주문 생성 시점으로 이동(`reserve_coupon`/`release_coupon`), 사후 increment 제거 | 〃 / `lib/payments/orders.ts` |
| H-3 | `refund_order()`가 누적 취소금액으로 부분/전액 판정 — 부분 취소는 수강권 유지 | 〃 / `lib/payments/policy.ts` |
| M-1 | `refund_order()`가 `select ... for update` 후 **현재** 상태로 전이 | 〃 |
| H-4 | `lessons_select_guarded`의 preview 분기에 `courses.status='published'` 조건 추가 | `20260731010256_...sql` |
| H-5 | `LoginScreen` 초기값을 빈 문자열로 | `components/LoginScreen.tsx` |
| H-6 | 계정·후기 시드를 `supabase/seed.local.sql`로 분리 | `supabase/seed*.sql` |
| X-1 · L-1 | admin 라우트 7개에 `assertSameOrigin` 추가, origin 비교에 scheme 포함 | `api/admin/**`, `lib/api/origin.ts` |
| X-2 · L-8 | `unwrap()` 도입해 조회 실패를 throw로 표면화 | `lib/supabase/query.ts` 외 5개 모듈 |
| X-3 | `runMutation()` 공통 실행기로 try/catch/finally 통일 | `DashboardScreen`·`LessonManager` |
| X-5 | Vitest 하네스 + 순수 판정 테스트 19개 | `vitest.config.ts`, `*.test.ts` |

### 검증 결과
- `pnpm typecheck` · `pnpm test`(19 passed) · `pnpm build` 통과
- 원격 DB 확인: 유니크 인덱스 1, role 트리거 1, **anon/authenticated의 `profiles.role` UPDATE 권한 0**,
  신규 함수 4개, preview 정책에 course status 조건 반영
- 프로덕션 서버 스모크: `/ko`·`/ko/classes`·`/ko/about`·`/ko/books`·`/en/classes`·`/ko/inquiries`·`/ko/login` 200,
  없는 클래스 slug는 **HTTP 404 유지**(loading.tsx 라우트 그룹 규약 정상)
- admin 라우트 5종에 잘못된 `Origin`으로 POST → 전부 **403**, 로그인 없이 same-origin POST → **401**
- 로그인 페이지 HTML에 시드 자격증명 문자열 없음

### 남은 검증(사람 필요)
Toss 샌드박스 결제창은 본인인증 때문에 자동화로 완결할 수 없다. 아래는 수동 확인이 필요하다.
1. 실제 결제 1건 완주 → 수강권 발급, 같은 강좌 재결제 시도 시 `already_paid`/`already_enrolled` 응답
2. 쿠폰 결제 후 주문 취소 → `coupons.redeemed_count` 원복
3. 운영자 전액 환불 → 주문 `refunded`, 수강권 회수, 재생·자료 접근 차단

### 8-1. 2차 리뷰 후속 (Codex `/codex:review`, 2026-07-31)

수정분을 다시 리뷰해 **내 수정이 만든 회귀 2건**을 잡았다. 둘 다 코드로 확인해 CONFIRMED.

| ID | 심각도 | 문제 | 처리 |
|---|---|---|---|
| P1 | Critical | `open_pending_order`가 기존 pending 주문을 **취소**해, 결제창이 이미 열린 주문이 무효화될 수 있었다. Toss는 capture하는데 DB는 `canceled` → 전이 가드와 강화된 `grant_enrollment`에 모두 막혀 **청구됐는데 수강권이 없는 상태**가 된다 | 취소 대신 **같은 행을 재사용**(금액·쿠폰만 갱신). 진행 중 confirm의 orderId가 유효하게 남고, 금액이 바뀐 경우 confirm이 **capture 전에** 금액 불일치(400)로 거절 |
| P2 | High | 쿠폰 예약을 주문 생성 시점으로 옮기면서, 결제까지 가지 않은 주문의 예약이 영구히 남았다(해제 경로가 '대체'·'전액 환불'뿐). 한정 쿠폰이면 결제창만 열고 이탈해도 재고가 고갈된다 | `close_unpaid_order()`가 확정적 미결제 종료에서 예약을 반환하고, `expire_stale_pending_orders()`(24h)가 방치분을 회수. 주문 생성 시 기회적으로 호출 |

`failed`는 webhook 복구 경로가 있어 예약을 즉시 반환하지 않고 만료 스윕(24시간)에 맡긴다 —
복구는 수분 내에 일어나므로 안전하고, 누수는 영구가 아니라 최대 24시간으로 한정된다.
스윕 기준을 24시간으로 크게 잡은 것도 P1과 같은 사고(진행 중 결제를 잘못 만료)를 막기 위해서다.

마이그레이션: `20260731013703_pending_order_reuse_and_coupon_release.sql`
앱: `api/payments/confirm`(2곳)·`api/payments/webhook`(ABORTED/EXPIRED)이 상태를 직접 쓰지 않고 RPC 경유.
