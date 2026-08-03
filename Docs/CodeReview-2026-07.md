# 전체 코드 리뷰 보고서 (2026-07-30)

> **2026-07-31 수정 반영 완료** — Critical 2건, High 6건, 횡단 X-1·X-2·X-3·X-5를 처리했다.
> 처리 내역은 [§8 수정 반영](#8-수정-반영-2026-07-31) 참조.
>
> **2026-08-03 2차 반영** — RLS 보강 묶음 M-2·M-3·M-4를 처리했다([§9](#9-rls-보강-묶음-2026-08-03)).
> 이로써 §7 권장 처리 순서 4단계(H-4·M-2·M-3·M-4)가 완결된다.
>
> **2026-08-03 3차 반영** — 서버 신뢰 경계 M-5·M-6·L-4와 스키마 L-7을 처리했다([§10](#10-서버-신뢰-경계--스키마-2026-08-03)).
> 이로써 **보안·데이터 무결성 성격의 지적은 전부 소진**됐다.
>
> **2026-08-03 4차 반영** — 남은 프론트·품질 결함 11건을 일괄 처리했다([§11](#11-프론트--품질-결함-일괄-2026-08-03)):
> M-7·M-8·M-9·M-10·M-11·M-13·L-2·L-3·L-5·L-6·X-2 잔여.
>
> **남은 항목은 X-4 하나**다. 다만 원 지적의 전제가 틀렸다 — §11에서 정정한다.
> (M-12는 §9에서 "결함 아님 — 존치 결정"으로 종료.)
>
> ⚠️ **사람이 직접 해야 할 검증이 누적돼 있다** — [§12](#12-사람이-직접-해야-할-검증-누적)에 모아 뒀다.

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

### 8-2. 3차 리뷰 후속 (2026-07-31)

8-1의 수정이 남긴 구멍 2건을 다시 잡았다. 둘 다 CONFIRMED.

| ID | 심각도 | 문제 | 처리 |
|---|---|---|---|
| P1 | High | pending 주문 재사용이 **금액 변경**을 허용해, confirm이 금액을 검증한 뒤 capture하기 전에 다른 탭이 금액·쿠폰을 바꿀 수 있었다. Toss는 옛 금액을 capture하는데 DB는 새 금액으로 paid가 된다 | capture 직전 **원자적 선점**(`claim_order_for_confirm`) 도입. 행을 잠그고 금액·소유자·수강권을 재확인한 뒤 `confirming`으로 전이 — 선점 성공한 요청만 Toss를 호출한다 |
| P2 | High | confirm 4xx로 `failed`가 된 주문의 쿠폰 예약이 스윕까지 남았다. `failed`는 열린-주문 유니크 인덱스 대상이 아니라 **잘못된 paymentKey로 반복 시도해 한정 쿠폰 재고를 묶을 수 있었다** | `close_unpaid_order`가 `failed`에서도 예약을 즉시 반환. webhook 복구(failed→paid)에서는 `mark_order_paid`가 재예약 |

**부수 효과**: `confirming` 상태가 생기면서 이중 capture 방어가 앱 조건문이 아니라
"동시에 하나만 존재하는 상태"로 표현된다(H-1의 최종 방어선). 또 5xx·타임아웃은 주문을
`confirming`으로 남겨 webhook 완결 경로를 유지하되, 같은 사용자의 재시도는 막는다
(불확실한 상태에서 두 번째 capture를 시도하지 않는 편이 안전).

**스윕 기간을 24시간 → 7일로 넓혔다**: 가상계좌는 입금까지 며칠이 걸려
24시간 스윕이 정상 대기 주문을 취소해 버린다. P2 수정으로 failed·canceled가 즉시
예약을 반환하므로 스윕은 방치분 백스톱으로만 남는다.

마이그레이션: `20260731040045_confirm_claim_and_coupon_release.sql`,
`20260731040154_expire_sweep_window_7d.sql`
앱: `api/payments/confirm`(claim 경유), `lib/payments/orders.ts`(`mark_order_paid`),
`api/payments/webhook`(`confirming`도 완결 대상)

**주문 상태 기계**(이 시점 기준):
`pending → confirming → paid` / `confirming|pending → failed|canceled` / `paid → refunded`

### 8-3. 4차 리뷰 후속 (2026-07-31)

8-2에서 `confirming` 상태를 도입하면서 **유니크 인덱스 술어와 주문 생성 경로에는 반영하지
않은** 불일치가 남아 있었다. CONFIRMED.

| ID | 심각도 | 문제 | 처리 |
|---|---|---|---|
| P1 | Critical | 인덱스가 `(pending, paid)`만 덮고 `open_pending_order`도 `pending`만 찾아, 승인 진행 중(`confirming`)인데도 두 번째 pending 주문이 생성될 수 있었다. 첫 결제가 capture되면 `confirming → paid` 전이가 유니크 인덱스에 걸려 실패 → **청구됐는데 수강권 없음** | 인덱스 술어를 `('pending','confirming','paid')`로 확장하고, `open_pending_order`가 `confirming` 주문을 발견하면 `confirm_in_progress`로 거절(재사용·신규 생성 모두 금지) |

`claim_order_for_confirm`의 `already_in_progress` 체크는 두 번째 주문의 **capture**만 막지
**생성**은 막지 못한다는 것이 핵심이었다. 이제 "같은 (사용자, 강좌)에 살아 있는 주문은
최대 1건"이 상태 전이 전 구간에서 인덱스로 보장된다.

승인 진행 중 주문은 **절대 건드리지 않는다**: 금액을 바꾸면 8-2의 P1(capture 금액과 DB
금액 불일치)이 되살아나고, 새로 만들면 위 인덱스 충돌이 난다. 잠금 사이 선점을 대비해
갱신에 `and status = 'pending'` 가드를 두고 0행이면 물러난다.

마이그레이션: `20260731043547_confirming_counts_as_open_order.sql`
앱: `api/payments/create-order` — `confirm_in_progress` → 409 안내

---

## 9. RLS 보강 묶음 (2026-08-03)

§7 권장 처리 순서 4단계(H-4·M-2·M-3·M-4) 중 7/31에 H-4만 나갔고 나머지 3건이 남아 있었다.
셋 다 공격면이 **PostgREST 직접 호출**이라는 공통점이 있다 — 앱 라우트는 올바른 컬럼만
쓰지만, 공격자는 라우트를 우회해 anon-key로 REST에 직접 요청할 수 있고 RLS는 **행만 보고
컬럼을 가리지 않는다**. C-1과 같은 결함 형태이므로, C-1에서 확립한 **컬럼 GRANT 분리**
규약을 그대로 적용했다. **앱 코드 변경 0건.**

마이그레이션: `20260803062515_rls_column_privileges.sql` (원격 `sowoo` 적용 완료)

| 항목 | 처리 |
|---|---|
| M-2 | `reviews`의 UPDATE 권한을 `(rating, content, updated_at)`으로 축소 — `course_id`를 못 바꾸므로 미수강 강좌로의 리뷰 이동이 불가능해진다 |
| M-3 | `inquiries`의 INSERT 권한을 `(user_id, category, subject, body)`로 축소 — `status`·`answer_body`·`answered_by` 주입 차단, 기본값(`status='open'`)은 그대로 적용 |
| M-4 | `profiles`의 anon SELECT를 `(id, display_name, avatar_url)`로 축소 — 비로그인 관리자 열거 차단. `authenticated`는 자기 행 `role`을 읽어야 하므로 유지 |

**M-2에서 정책 대신 권한을 택한 이유**: 지적대로 `reviews_modify_own`의 `with check`에
`has_course_access(course_id)`를 더하면, **환불로 수강권이 회수된 사용자가 기존 후기의
오타조차 고칠 수 없게 되는** 의도치 않은 동작 변경이 생긴다. 컬럼 권한으로 막으면
이동(=공격)만 불가능해지고 정상 수정 경로는 그대로다.

**M-4의 안전 전제**: `is_admin()`·`has_course_access()`가 `security definer`
(`20260708081512:30,38`)라 정책 내부에서 `profiles.role`을 읽을 때 호출자의 컬럼 권한이
적용되지 않는다. 이 전제가 없으면 anon이 평가하는 모든 정책이 깨지므로 검증 1순위였다(아래).
**잔여 위험**: 계정을 가진 공격자는 여전히 타인의 `role`을 읽을 수 있다. 근본 차단은 공개 뷰
분리가 필요하나 PostgREST 임베드 조인 3곳을 갈아야 해 이번 범위에서 제외했다.

### 검증 결과
- **적용 전 baseline 확인** — `anon_reads_role` / `auth_moves_review` / `auth_sets_status` 전부 `true`(결함 실재)
- **적용 후 `has_column_privilege` 15종** 전부 기대치 일치:
  anon의 `profiles.role`·`locale` = false, `display_name`·`avatar_url` = true /
  authenticated의 `reviews.course_id`·`user_id` UPDATE = false, `rating`·`content` = true /
  `inquiries.status`·`answer_body` INSERT = false, `subject`·`user_id` = true /
  service_role은 전부 유지
- **`set role anon`으로 정책 평가 확인** — `is_admin()` 평가 정상(false 반환, 오류 없음),
  `courses` 3건·`reviews` 4건·`profiles.display_name` 6건 조회 성공.
  `profiles.role` 조회는 `insufficient_privilege`로 차단됨 → **M-4 공격 시나리오 DB 레벨 재현 차단 확인**
- `pnpm typecheck` · `pnpm test`(19 passed) · `pnpm build` 통과
- 프로덕션 서버(포트 3100) 비로그인 스모크: `/ko`·`/ko/classes`·`/ko/about`·`/ko/books`·
  `/en/classes`·`/ko/inquiries`·`/ko/login`·`/ko/classes/class-macarons`·`/ko/classes/class-tart` 200,
  없는 slug **404 유지**
- **임베드 조인 회귀 확인** — `/ko/classes/class-macarons` HTML에 실제 후기 작성자명
  2건(`김은지`, `Chao-Jung Chen`)이 렌더됨. 권한이 부족했다면 `catalog.ts`의 fallback
  `'수강생'`으로 떨어졌을 자리다
- Supabase advisor: **신규 경고 0건**(기존 `security_definer_view`·SECURITY DEFINER 함수 노출·
  leaked password 경고는 §6에 의도적 유지로 기록된 것들)

`supabase/database.types.ts`는 **재생성하지 않았다** — 테이블 형상 변경 없이 권한만 바뀌어
타입에 반영되지 않는다.

### 남은 검증(사람 필요)
MCP `execute_sql`의 쓰기는 하네스 안전 분류기가 차단하므로, 실제 REST 왕복으로 INSERT/UPDATE가
거부되는지는 `curl`로 확인이 필요하다(위 `set role anon` 검사로 M-4는 이미 DB 레벨 확인됨).
1. 회원 JWT로 `POST /rest/v1/inquiries`에 `status`/`answer_body`를 실어 전송 → **403(42501)** 기대
2. 회원 JWT로 `PATCH /rest/v1/reviews?id=eq.<본인후기>`에 `course_id` 변경 → **403(42501)** 기대
3. 앱 정상 경로 회귀: 후기 작성/수정, 문의 등록, 운영자 답변 등록

### 부수 확인 사항
- **M-12(도서 정본 이원화)는 결함 아님으로 종료한다.** `src/` 전체에 `from('books')`가 없어
  앱은 `books` 테이블을 전혀 읽지 않는다(정본은 `src/lib/books-data.ts`). 테이블·seed 존치는
  CLAUDE.md에 기록된 의도적 결정이므로 드리프트 위험이 실재하지 않는다.
- **§8의 "X-2 적용" 서술을 정정한다.** `unwrap()`은 catalog·admin·inquiries·lessons·materials에
  적용됐으나 **`catalog.ts:153`의 `Promise.all` 블록**(`const [{ data: rows }, { data: completedRows }]`)과
  **`src/lib/enrollments.ts:11`**은 아직 bare `const { data }`다. X-2는 **부분 적용** 상태이며,
  이 두 곳은 L-3(완료 진도 전량 조회 범위 제한)과 같은 함수에 있으므로 함께 처리하는 것이 낫다.

---

## 10. 서버 신뢰 경계 · 스키마 (2026-08-03)

남은 항목 중 **서버가 클라이언트를 신뢰하는 지점** 4건을 묶었다. 공통 주제는 하나다 —
M-6은 진도 값을, M-5는 Mux가 돌려준 재생 정책을, L-4는 접근권을, L-7은 통화 값을
각각 되짚어 확인하지 않고 받아들이고 있었다.

마이그레이션: `20260803071036_orders_currency_check.sql` (원격 `sowoo` 적용 완료)

| 항목 | 처리 |
|---|---|
| M-6 | `watchedSec`을 차시 길이로 clamp하고 `completed`를 **서버가 도출**(`watchedSec >= duration × 0.9`). 클라이언트의 `completed` 주장은 duration을 아는 한 무시한다 |
| L-4 | `api/progress`가 재생 토큰 라우트(TS-API-12)와 동일하게 비미리보기 차시에 `has_course_access()` 재확인 — RLS 단독 방어 해소 |
| M-5 | `getUploadResult`의 public ID fallback 제거. signed 정책 ID가 없으면 `errored`로 fail-closed |
| L-7 | `orders.currency`에 `check (currency in ('KRW'))` 추가 |

**M-6·L-4를 한 번에 처리한 이유**: 둘 다 `api/progress/route.ts`의 같은 `lessons` 조회를
쓴다. `.select('id')`를 `('id, course_id, is_preview, duration_sec')`로 넓혀 **추가 왕복 없이**
`course_id`·`is_preview`는 이중 방어에, `duration_sec`는 진도 판정에 썼다.

**판정 로직은 `src/lib/progress/policy.ts`로 분리했다** — `lib/mux/ttl.ts`·`lib/payments/policy.ts`와
같은 형태다. 라우트는 Supabase 클라이언트에 묶여 단위 테스트에서 import할 수 없으므로,
자동 검증이 필요한 판정만 순수 함수로 빼는 리포 규약을 따랐다(X-5 하네스가 커버하는 유일한 종류).

**M-5에서 `errored`를 택한 이유**: fallback만 지우고 `playbackId: null`로 두면
`admin/mux/upload/status/route.ts:42`의 저장 가드에 걸려 아무것도 저장되지 않지만,
`state: 'ready'`라 폴링만 멈추고 **운영자에게 아무 신호가 남지 않는다**. `errored`면 기존
업로드 실패 UI가 그대로 뜨고 `console.error`에 자산 ID가 남는다.

**L-4에 대한 문서 정정**: 원 지적의 "H-4와 결합 시 실제 구멍"이라는 전제는 **이번 수정 전에
이미 해소돼 있었다**. `api/progress`는 쓰기 전에 `lessons` 조회로 접근권을 확인하고 있었고,
H-4 수정으로 draft 강좌의 preview 누수도 막혔다. 실제로 남아 있던 것은 재생 토큰 라우트와의
**이중 방어 비대칭**뿐이며, 이번에 그것만 없앴다.

### 검증 결과
- `pnpm typecheck` 통과 · `pnpm test` **29 passed**(기존 19 + `progress/policy` 신규 10) · `pnpm build` 통과
- **기존 진도 데이터가 새 판정과 일치** — 2행 모두 재판정 결과가 동일(21/24=0.875 → 미완강,
  23/24=0.958 → 완강). 즉 이번 변경은 정상 시청 이력을 뒤집지 않는다
- **`over_duration` 위반 행 0** — 현재 데이터에 `watched_sec > duration_sec`인 행은 없다
  (결함이 실제로 악용된 흔적은 없고, 이번 수정은 예방적)
- L-7 제약 확인: `orders_currency_check` = `CHECK ((currency = 'KRW'::text))` 존재
- Supabase advisor 신규 경고 0건
- 프로덕션 빌드(포트 3100) 스모크: `/ko`·`/ko/classes`·`/ko/about`·`/ko/books`·`/en/classes`·
  `/ko/inquiries`·`/ko/login`·`/ko/classes/class-macarons` 200, 없는 slug **404 유지**
- `POST /api/progress` — 비로그인 **401**, 교차 출처 **403**

### 남은 검증(사람 필요)
로그인 세션이 필요한 아래 3건은 자격증명이 없어 확인하지 못했다. 브라우저로 로그인한 뒤
DevTools 콘솔에서 `fetch('/api/progress', ...)`로 확인하면 된다.
1. **미수강 차시**(비미리보기)에 진도 쓰기 → `403 no-access` (L-4의 `has_course_access` 분기)
2. **진도 부풀리기** — `watchedSec`을 `duration_sec`보다 크게 전송 → DB의 `progress.watched_sec`가
   `duration_sec`로 clamp되는지
3. **완강 위조** — `{watchedSec: 0, completed: true}` 전송 → `progress.completed`가 **false로 남는지**
   (M-6의 핵심). 이어서 학습 화면의 "완강" 버튼이 정상 동작하는지도 함께 확인

M-5는 Mux 키가 프로비저닝된 환경에서 실제 업로드 1건으로 `ready` → `lessons.mux_playback_id`
저장 → 재생까지 확인이 필요하다.

---

## 11. 프론트 · 품질 결함 일괄 (2026-08-03)

남은 11건을 성격별 4묶음으로 처리했다. **DB 변경 없음**(마이그레이션·타입 재생성 불필요).

| 묶음 | 항목 | 처리 |
|---|---|---|
| A · 학습 화면 | **M-7** | 완강 등록이 서버 실패를 삼키던 `.catch(() => {})` 제거. 낙관적 갱신을 **되돌리고** 인라인 오류를 표시하며, 성공 시에도 응답의 `completed`를 진실로 삼는다 |
| | **M-10** | 재생 차시를 **URL 소스**로 전환. `?lesson=`을 `useState` 초기값이 아니라 `useMemo`로 도출하고, 차시 선택은 `router.replace(..., { scroll: false })` |
| B · 운영자 화면 | **M-8** | Mux 인코딩 폴링에 언마운트 감지(`unmountedRef`) + `AbortController` 추가. `setUpload`도 언마운트 후엔 no-op |
| | **M-11** | `global-error.tsx`가 `reset`을 받아 "다시 시도" 버튼 제공 |
| C · 데이터 접근 | **M-13** | `getAdminInquiries`의 JS 정렬을 SQL로(`order('status').order('created_at')`) + `limit(200)`. 후기 조회에 `limit(50)` |
| | **L-3** | 완료 진도 조회를 `.in('lessons.course_id', courseIds)`로 범위 제한 |
| | **X-2 잔여** | `catalog.ts`의 `Promise.all` 두 결과와 `enrollments.ts`를 `unwrap()`으로 — **X-2 규약 완결** |
| D · 노출·접근성 | **L-2** | `problemWithCause()` 헬퍼 도입 — 원인은 `console.error`로만, 응답 `detail`은 한국어 고정 |
| | **L-5** | 스켈레톤을 `<output aria-busy>` + `sr-only` 텍스트로. 회색 막대만 `aria-hidden` |
| | **L-6** | `ChefBanner`에 `aria-labelledby="chef-heading"` |
| 별도 | **M-9** | `DetailScreen`·`MyClassesScreen`의 `router.push('/')` → `'/classes'` |

### 설계 판단

**M-7이 M-6과 맞물린다**: §10에서 완강 판정이 서버로 옮겨갔으므로, 클라이언트는 이제
"완강했다"고 주장하는 게 아니라 **서버 응답을 받아 적는다**. 응답 `completed`가 false면
(시청 기록 부족) 체크를 되돌리고 사유를 알린다.

**M-10에 `replace`를 쓴 이유**: `push`면 차시 전환마다 히스토리가 쌓여 뒤로가기로 강좌
상세에 돌아가지 못한다. 라우터는 `@/i18n/navigation`의 것을 써서 로케일 프리픽스를 지킨다.

**M-13 정렬을 SQL로 옮길 수 있었던 근거**: `inquiry_status` enum이
`('open','answered','closed')` 순으로 선언돼 있어(`20260729050656_inquiries.sql:6`)
**enum 오름차순이 곧 기존 JS `statusRank`와 동일**하다. DB에서 확인했다.
`limit(200)`을 걸어도 미답변이 항상 앞에 오므로 운영자가 놓치는 문의는 없다.

**L-2에서 손대지 않은 곳**: `payments/confirm`의 `getTossFailureMessage()`와 `reviews`의
`reviewError()`는 공급자·PG 코드를 **의도적으로 사용자 문구로 매핑**하는 장치다(§6 정상 항목).
다만 `reviewError`의 **미매핑 코드 원문 폴백**은 실질적 누수라 고정 문구로 바꿨고,
운영자 환불의 PG 취소 실패도 같은 매핑 유틸을 재사용하도록 바꿨다(마스킹이 아니라 번역).

### X-4에 대한 기술 정정

원 지적은 "`messages/{ko,en}.json`의 키 집합은 일치하지만 화면이 키를 참조하지 않는다"고
적었으나, 확인 결과 **대상 화면의 키가 아예 존재하지 않는다**. 현재 네임스페이스는
`nav·hero·quiz·pillars·grid·btn·footer·books·instructor` 9개뿐이고
`detail·player·myclasses·inquiries`는 없다.

따라서 X-4는 **배선 작업이 아니라 4개 화면 138줄 분량의 ko/en 카피 신규 작성**이며,
영문은 마케팅 문구 창작을 포함한다. 결함 수정과 성격도 검증 방법도 달라 별도 라운드로 분리했다.
착수 전에 영문 카피의 톤을 합의할 것.

### 검증 결과
- `pnpm typecheck` · `pnpm test`(29 passed) · `pnpm build` 통과
- `biome check --formatter-enabled=false`로 변경 30개 파일 **지적 0건**
  (format 에러는 리포 전역 CRLF 문제로 기존 조건 — 손대지 않은 파일도 동일하게 실패)
- **L-2 실측** — `POST /api/playback/token`에 잘못된 UUID → `detail`이
  `"요청 형식이 올바르지 않습니다."`. Zod 내부 문자열(`invalid_`·`expected`·`path` 등) 미포함 확인.
  소스 전수 검색에서 남은 `error.message` 전달처는 의도적 매핑 2곳뿐
- **L-3·M-13 쿼리 문법 검증** — 새로 쓴 PostgREST 표현을 실제 REST로 호출해 **400이 아닌 200** 확인
  (`lessons.course_id=in.(...)` 임베드 필터, `order=status.asc,created_at.desc&limit=200`).
  `unwrap()` 적용으로 문법 오류가 곧 화면 500이 되므로 이 검증이 필수였다
- **L-6** — `/ko` HTML에 `aria-labelledby="chef-heading"`·`id="chef-heading"` 각 1건
- **회귀** — `/ko/classes/class-macarons`에 후기 작성자명이 계속 렌더됨(`limit(50)` 도입 후에도)
- 비로그인 스모크 9경로 200 + 없는 slug **404 유지**

---

## 12. 사람이 직접 해야 할 검증 (누적)

§8~§11에서 자동 검증하지 못한 항목을 **한 곳에 모았다**. 로그인 세션·운영자 권한·외부 키·
결제창 본인인증이 필요해 도구로 완결할 수 없는 것들이다. 위에서부터 순서대로 진행하면
로그인 → 학습 → 운영자 → 결제로 자연스럽게 이어진다.

### A. 로그인 회원으로 (학습 화면)

| # | 항목 | 절차 | 기대 |
|---|---|---|---|
| 1 | §11 M-7 | 학습 화면에서 "차시 수강완료" 클릭 → 새로고침 | 완강 체크가 유지된다 |
| 2 | §11 M-7 | DevTools Network를 **Offline**으로 두고 다시 클릭 | 체크가 **되돌아가고** 버튼 아래 붉은 안내가 뜬다(예전엔 조용히 사라졌다) |
| 3 | §11 M-10 | 차시 A → B 선택 후 **브라우저 뒤로가기** | URL과 재생 차시가 **함께** A로 돌아온다 |
| 4 | §11 M-10 | `/learn/<id>?lesson=<B의 id>`로 직접 진입 | B가 재생된다 |
| 5 | §10 M-6 | 콘솔에서 아래 ① 실행 | `progress.completed`가 **false로 남는다**(완강 위조 차단) |
| 6 | §10 M-6 | 콘솔에서 아래 ② 실행 | `watched_sec`이 `duration_sec`로 **clamp**된다 |
| 7 | §10 L-4 | **미수강**(비미리보기) 차시 id로 ① 실행 | `403 no-access` |
| 8 | §9 M-3 | 아래 ③ 실행 | **403 (42501)** — 답변 필드 주입 차단 |
| 9 | §9 M-2 | 아래 ④ 실행 | **403 (42501)** — 리뷰 이동 차단 |

```js
// ① 완강 위조 / 미수강 접근
await fetch('/api/progress', { method:'POST', headers:{'Content-Type':'application/json'},
  body: JSON.stringify({ lessonId:'<LESSON_ID>', watchedSec:0, completed:true }) }).then(r=>r.json())

// ② 진도 부풀리기 (duration_sec보다 크게)
await fetch('/api/progress', { method:'POST', headers:{'Content-Type':'application/json'},
  body: JSON.stringify({ lessonId:'<LESSON_ID>', watchedSec:999999 }) }).then(r=>r.json())
```

③④는 앱이 아니라 **PostgREST에 직접** 쏴야 의미가 있다(앱 라우트는 이미 올바른 컬럼만 쓴다).
`<ANON_KEY>`는 공개키, `<JWT>`는 로그인 세션의 access token.

```bash
# ③ 문의 INSERT에 status/answer_body 주입
curl -i -X POST "https://ptwgrmdtzdphervuanxi.supabase.co/rest/v1/inquiries" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"user_id":"<SELF>","category":"기타","subject":"주입","body":"주입","status":"answered","answer_body":"위조"}'

# ④ 본인 후기를 미수강 강좌로 이동
curl -i -X PATCH "https://ptwgrmdtzdphervuanxi.supabase.co/rest/v1/reviews?id=eq.<REVIEW_ID>" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"course_id":"<미수강_COURSE_ID>"}'
```

### B. 운영자 계정으로

| # | 항목 | 절차 | 기대 |
|---|---|---|---|
| 10 | §11 M-8 | 영상 업로드 시작 → **인코딩 중에 다른 페이지로 이동** | 콘솔에 언마운트 후 setState 경고가 없고 Network의 `upload/status` 폴링이 **멈춘다** |
| 11 | §11 M-13 | 대시보드 "문의 · 답변 관리" | 미답변(open)이 **항상 위**에 온다. *현재 DB에 문의가 0건이라 자동 확인 불가했다 — 문의를 몇 건 만들어 확인할 것* |
| 12 | §11 L-2 | 아무 운영 액션이나 실패시켜 오류 표시 확인 | 화면에 DB 제약명·PostgREST 원문이 **보이지 않고** 한국어 안내만 뜬다 |
| 13 | §10 M-5 | Mux 키가 있는 환경에서 실제 업로드 1건 | `ready` → `lessons.mux_playback_id` 저장 → 재생까지 정상 |

### C. 결제 (Toss 샌드박스 — 본인인증 때문에 자동화 불가)

| # | 항목 | 기대 |
|---|---|---|
| 14 | 실결제 1건 완주 | 수강권 발급. 같은 강좌 재결제 시도 시 `already_paid`/`already_enrolled` |
| 15 | 쿠폰 결제 후 주문 취소 | `coupons.redeemed_count` 원복 |
| 16 | 운영자 전액 환불 | 주문 `refunded`, 수강권 회수, 재생·자료 접근 차단 |

### D. 재현이 어려워 코드 확인으로 갈음 가능

| # | 항목 | 비고 |
|---|---|---|
| 17 | §11 M-11 | 루트 레이아웃 오류를 인위적으로 일으켜야 global-error가 뜬다. "다시 시도" 버튼이 `reset`을 호출하는지 코드로 확인해도 무방 |
| 18 | §11 L-5 | 스켈레톤은 라우트 전환 순간에만 보인다. 느린 네트워크로 스로틀링해 스크린리더가 "불러오는 중"을 읽는지 확인 |
