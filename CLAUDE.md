# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Atelier Crème** (`atelier-creme`) — a French-baking masterclass (VOD) platform. Next.js 15 App Router + Supabase (Auth/DB/Storage/RLS) + Mux (signed video) + TossPayments v2 (KRW settlement). Bilingual: Korean (`ko`, default) and English (`en`). Code comments and user-facing copy are Korean.

## Commands

Package manager is **pnpm** (enforced by `vercel.json` and the `pnpm` block in `package.json`).

- `pnpm dev` — dev server on **port 3000** (payment/origin guards assume `http://localhost:3000`)
- **성능 진단 주의**: `pnpm dev`는 라우트를 처음 방문할 때마다 on-demand 컴파일한다 — "클릭이 느리다"는 대부분 이 dev 컴파일이지 앱 성능이 아니다. 실제 성능은 `pnpm build && pnpm start`로 검증할 것. dev 스크립트는 `--turbopack` 사용. 실행 모드 판별: `.next/BUILD_ID` 없으면 dev.
- `pnpm build` / `pnpm start`
- **프로덕션 검증은 포트 3100에서** — 3000은 사용자 dev 서버가 점유 중일 때가 많다. `PORT=3100 pnpm start`.
- **`TaskStop`은 node를 죽이지 않는다** — 리스너가 남아 다음 `pnpm start`가 `EADDRINUSE`로 조용히 실패하고, 그대로 curl하면 **구 빌드를 측정하게 된다**. 종료 후 반드시 `netstat -ano | grep ":3100 "` → `taskkill //PID <pid> //F`로 해제를 확인할 것.
- `pnpm lint` — Biome check. **주의: 커밋된 파일이 CRLF라 리포 전체에서 `format` 에러로 실패한다(main도 동일, pre-existing).** 실제 지적만 보려면 **`npx biome check --formatter-enabled=false <경로>`** — CRLF 노이즈가 걷히고 lint/organizeImports 위반만 남는다.
- **`biome check --write`를 디렉터리에 돌리지 말 것** — 손대지 않은 파일의 import까지 정렬해 diff를 오염시킨다. 변경한 파일만 명시할 것.
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm test` — Vitest(`vitest run`). 순수 판정 로직만 대상이며 DB·네트워크에 의존하지 않는다(`vitest.config.ts` 주석 참조).
- `pnpm format` 존재하나 **리포 전체 실행 금지**(CRLF로 대량 diff). 포맷은 변경 파일에만 개별 적용.
- Database: migrations live in `supabase/migrations/` (timestamped). 원격 프로젝트는 **`sowoo` = `ptwgrmdtzdphervuanxi`**. 로컬 Docker가 없어 Supabase **MCP**로 운영: `apply_migration`(DDL) 후 `generate_typescript_types`로 `supabase/database.types.ts` 재생성. **`apply_migration`은 자체 UTC 타임스탬프를 version으로 부여하므로**, 적용 후 `list_migrations`로 확인해 **로컬 파일명을 그 version에 맞출 것**(로컬 KST로 지으면 어긋난다). 권한(GRANT)·CHECK 제약만 바꿨다면 타입 재생성은 불필요하다. **주의: MCP `execute_sql`의 쓰기(INSERT/UPDATE/DELETE)는 하네스 안전 분류기가 차단**하므로 데이터 시드/변경은 앱 플로우로 하거나 사용자에게 요청. `createServerClient<Database>`가 타입에 의존하므로 스키마 변경 후 재생성 필수.

**Windows quirk**: Bash 툴에서 Python/echo로 한글을 stdout에 출력하면 `UnicodeEncodeError: 'cp949'`가 난다. Python은 `sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')`로 감쌀 것.

**Bash 툴 heredoc 한계**: 따옴표·중괄호가 많은 Python을 `python - <<'PY'`로 넘기면 bash가 `unexpected EOF`로 깨진다. 여러 줄 스크립트는 **스크래치패드에 `.py`로 쓴 뒤 `python <path>`로 실행**할 것. 반대로 git 커밋 메시지는 heredoc(`git commit -F - <<'EOF'`)이 안전하다 — **PowerShell here-string(`@'...'@`)을 Bash 툴에 쓰면 `@`가 본문에 그대로 들어간다.**

## Architecture — the parts that span files

### Auth & trust boundary (read before touching anything under `src/app/api` or `src/lib/supabase`)
Two Supabase clients, deliberately separate:
- `lib/supabase/server.ts` `createClient()` — request-scoped, reads the user session from cookies, **subject to RLS**. Use for all normal reads. `getUser()` / `getProfile()` (role) are helpers here. `getUser()`는 **React `cache()`로 요청 스코프 메모이즈** — 같은 요청 내 여러 호출도 Supabase Auth 왕복 1회. 내부에서 `supabase.auth.getUser()`를 직접 부르지 말고 이 헬퍼를 재사용할 것.
- `lib/supabase/admin.ts` `createAdminClient()` — `service_role`, **bypasses RLS**. Guarded by `import 'server-only'`. Use *only* for server-authoritative writes (order completion, enrollment grants, admin console mutations).

Because `service_role` bypasses RLS, **RLS is never the sole gate**. Admin API routes must call `requireAdmin()` (`lib/auth/require-admin.ts`) at the app layer; the DB `is_admin()` RLS is only a backstop. Sensitive reads use **double defense**: RLS gates the row (e.g. `lessons_select_guarded`) *and* the route re-checks access (e.g. `has_course_access()` RPC in the playback route).

`middleware.ts` refreshes the Supabase session cookie on every non-API request and runs next-intl locale routing on the **same** response object. Its `matcher` deliberately excludes `/api` and `/auth` — so route handlers get **no** middleware auth/CSRF protection and must guard themselves. 성능상 미들웨어는 **`sb-*-auth-token` 쿠키가 있을 때만** `getUser()`(Auth 서버 왕복)를 호출한다 — 비로그인 이동에서 매번 왕복하지 않도록.

### CSRF / same-origin
State-changing route handlers call `assertSameOrigin(request)` (`lib/api/origin.ts`) first, because middleware skips `/api` and Next has no built-in CSRF for route handlers. Missing `Origin` header is allowed through on purpose (server-to-server / CLI). Prefer `x-forwarded-host` over `request.url` (Vercel proxy).

### Payments (`src/app/api/payments/*`, `lib/payments/*`)
The confirm flow (`payments/confirm/route.ts`) is the critical trust boundary and encodes hard-won invariants — preserve them when editing:
- **Amount is re-derived server-side**: the client-supplied `amount` is compared against `order.amount_krw`, never trusted.
- **Idempotent**: an already-`paid` order returns success without re-charging; webhook and confirm can race.
- **Double-charge guard**: before calling Toss confirm (= capture), it checks for an existing active enrollment; unconfirmed authorizations expire uncharged.
- **Failure handling is status-dependent**: only deterministic 4xx marks the order `failed`; 5xx/timeout keeps it `pending` so the webhook can complete it — Toss may have actually approved.

The webhook (`payments/webhook/route.ts`, `TS-API-11`) is the completion path for async methods (e.g. virtual accounts) and a recovery path when confirm left an order `pending` **or `failed`** (Toss may have approved after confirm hit a transient error). It never trusts the payload — it re-fetches the payment from Toss by `paymentKey`. Both confirm and the webhook call the shared `completePaidOrder` (`lib/payments/orders.ts`), which is idempotent: the `orders` update is guarded by `.in('status', ['pending','failed'])` and re-`select()`ed so only one caller is the real transitioner (coupon increments key off that), and `grant_enrollment` is unique on `order_id`. It also maps `CANCELED`→`refunded`/`canceled` on the order and enrollments. 운영자 환불(`api/admin/orders/[id]/refund`)과 webhook 취소는 공유 `refundOrder`(`lib/payments/orders.ts`)로 주문·수강권을 `refunded` 전이(하드삭제 없음)한다.

**테스트 결제 e2e 주의:** Toss 샌드박스 카드 결제창은 본인인증(주민번호 등) 입력을 요구해 브라우저 자동화로 완결 불가 — 결제 승인 단계는 사람이 직접 완료해야 한다. `gh` CLI는 이 환경에 미설치라 PR은 GitHub compare URL로 수동 생성.

### Video playback (`src/app/api/playback/token`, `lib/mux`)
Issues a short-lived signed Mux JWT after verifying enrollment (or `is_preview`). Token TTL scales with lesson duration so one token covers full playback. Returns `503 mux-unconfigured` when Mux keys aren't provisioned — the code ships before keys exist.

### API conventions
- Errors use RFC 7807 Problem Details via `problem(status, type, title, detail)` (`lib/api/problem.ts`); `detail` is Korean, user-facing.
- Request bodies validated with **Zod** (v4). Use `z.guid()` for Postgres UUIDs, **not** `z.uuid()` — Zod v4's `z.uuid()` validates RFC 4122 variant/version bits and rejects otherwise-valid Postgres UUIDs.

### i18n
`next-intl` with `/[locale]` routing (`src/i18n/routing.ts`, locales `ko`/`en`). Translations in `messages/{ko,en}.json`. All pages live under `src/app/[locale]/`. Use the navigation helpers in `src/i18n/navigation.ts`, not raw `next/link`, to keep locale prefixes.

**네임스페이스 규약(EPIC-K)**: 화면 단위 평면 구조 — `detail`·`payment`·`player`·`login`·`myclasses`·`inquiries`·`classes`·`review`·`common`. `sections/*` 컴포넌트는 `sections` 아래 한 겹(`sections.chef`·`sections.catalog`·`sections.card` …). 배열 데이터는 `t.raw()` + 타입 단언(`AboutScreen.tsx` 참조).

**`src/i18n/messages.test.ts`가 네 가지를 잠근다** — ko/en 키 집합 동등성, 미참조 네임스페이스, en 값의 한글 잔존, 그리고 **`I18N_DONE`에 오른 컴포넌트의 하드코딩 한글**. 새 고객 화면을 만들면 이 배열에 추가할 것. 운영자 콘솔(`DashboardScreen`·`LessonManager`)은 의도적으로 범위 밖이다(운영자는 한국어 단일 사용자).

**번역하면 안 되는 것 두 가지**: ① 금액·날짜는 `lib/format.ts`의 `formatKrw`/`formatDate`로 — 로케일을 지정하지 않은 `toLocaleString()`은 서버/브라우저 기본값이 달라 하이드레이션이 깨진다. ② API·DB에 저장되는 **값**(문의 분류·코스 카테고리)은 `lib/inquiry-categories.ts`·`lib/course-categories.ts`에 두고 라벨만 메시지에서 꺼낸다.

**`messages/*.json`은 CRLF다** — `json.dumps`로 통째로 재직렬화하면 인라인 객체가 펼쳐져 무관한 diff가 대량 발생한다. 네임스페이스 추가는 **닫는 `}` 앞에 텍스트로 삽입**하고 CRLF를 보존할 것.

**강좌·차시 콘텐츠는 아직 한국어뿐이다** — `pickLocale()`(`lib/i18n-json.ts`)은 정상이지만 DB의 `en` 값이 비어 있어 `/en`에서도 강좌 제목·설명이 한국어로 나온다. 코드가 아니라 데이터 문제이며 **Jira DC-108** 소관이다.

### 정보구조 — 홈·소개·온라인 클래스 3면 (DC-96)
홈(`/`)은 **브랜드 게이트웨이**이고 클래스 목록 본체는 **`/classes`**, 브랜드/셰프 소개는 **`/about`**이다(구 `/instructor`는 `/about` 리다이렉트). 화면 골격은 `src/components/{HomeScreen,ClassesScreen,AboutScreen}.tsx`가 조립하고, 재사용 섹션은 **`src/components/sections/`**(`PhilosophyPillars`·`RecommendationQuiz`·`ClassCard`·`ClassCatalogGrid`·`StudentArchive`·`ChefBanner`·`FaqAccordion`·`NewsletterCTA`·`BestClasses`)에 있다. **`src/features/`는 없다** — TechSpec의 `features/*` 표기는 to-be다.

**검색은 URL이 소스**: `MeringueHero`(홈)는 검색어를 자체 state로 두고 제출 시 `/classes?q=`로 `push`하며, `/classes` 페이지가 `searchParams`로 초기값을 받아 `ClassCatalogGrid`에 넘긴다. 홈에 그리드가 없으므로 히어로에 검색 state를 되돌리지 말 것.

**`loading.tsx`는 라우트 그룹으로 범위를 좁혀 둔다 — 함부로 옮기지 말 것.** `loading.tsx`는 Suspense 셸을 즉시 flush하고, 헤더가 나간 뒤에는 상태 코드를 바꿀 수 없어 그 하위에서 `notFound()`를 호출하면 **HTTP 200**(soft-404)이 된다. 그래서 홈은 `[locale]/(home)/`, 클래스 목록은 `classes/(list)/`에 페이지와 `loading.tsx`를 함께 두어 `classes/[id]`를 감싸지 않게 했다(라우트 그룹이라 URL은 그대로). **`classes/[id]`에는 `loading.tsx`를 만들지 말 것.** 상위 세그먼트의 `loading.tsx`도 하위 전체를 감싼다는 점을 함께 볼 것. `checkout/[id]`·`learn/[id]`·`admin/courses/[id]`는 인증 뒤라 색인 대상이 아니어서 스켈레톤을 유지했고 `notFound()` 시 200이다(의도). 실측 근거는 `Docs/UXGuide.md` §8.6.

### 문의사항(Inquiries, DC-97)
**1:1 비공개**: `inquiries` RLS는 `owner-or-admin`(작성자 본인 OR `is_admin()`)이라 목록·상세는 **라우트 없이 RSC에서 쿠키 클라이언트로 직접 조회**한다(`src/lib/inquiries.ts` — 같은 쿼리가 작성자에겐 본인 것만, 운영자에겐 전체를 돌려주므로 앱에서 소유자 필터를 중복하지 말 것). 쓰기는 `POST /api/inquiries`(세션에서 `user_id` 주입)·`PATCH /api/admin/inquiries/[id]`(`requireAdmin`, `answered_by/at` 서버 주입)만 경유한다. 운영자 답변 UI는 별도 라우트가 아니라 `DashboardScreen`의 "문의 · 답변 관리" 섹션이며, 초기 데이터는 `getAdminDashboard()`가 함께 실어 준다.

### 도서(Books)
도서는 **추천 큐레이션**(외부 쿠팡 판매, 파트너스 제휴)으로, 자체 결제·배송이 없다. 데이터는 `books` 테이블이 아니라 **정적 상수 `src/lib/books-data.ts`**에서 오며(`getBooks()` in `src/lib/books.ts`), 표지는 로컬 자산(`public/books/`). `books` 테이블·seed는 이력용으로 존치되지만 앱은 읽지 않는다.

## Docs & a documentation gotcha
Design docs are in `Docs/` (`PRD.md`, `TechSpec.md`, `DBSchema.md`, `UXGuide.md`) and API/security items are traceable by `TS-*` codes (e.g. `TS-API-10`, `TS-SEC-02`) referenced in route comments.

**`TechSpec.md` is the "to-be" target spec, not as-built.** It lists TanStack Query and Zustand, but the actual app installs neither — server state is plain RSC fetching and there is no global client store yet. Trust the code over the spec for what's actually wired up.

## Jira
이슈 추적은 **`claude.ai Atlassian Rovo` 커넥터**(cloudId `7cb9460c-4bd1-42dc-9f05-491aa11178dd`), 프로젝트 **`DC`(dessert Class)**. 다른 `mcp-atlassian` 커넥터는 접근 가능한 프로젝트가 없으니 쓰지 말 것. Jira의 EPIC/작업(DC-*)은 `Docs/plan.md`의 EPIC과 대응된다.

**주의**: `searchJiraIssuesUsingJql`를 프로젝트 전체에 돌리면 토큰 한도를 초과한다. **`fields`를 명시해도 초과한다**(실측) — 결과가 파일로 저장되므로 그 **JSON을 Python으로 파싱하는 것이 유일하게 확실한 방법**이다. 상태 전이 ID(DC 워크플로): **할일=11 · 진행중=21 · 검토중=31 · 완료=41**.

**완료 전이 전에 `getJiraIssue`로 `description`의 완료 기준을 읽을 것.** 요약(summary)만 보고 판단하면 오판한다 — DC-70·DC-54를 "완료"로 잘못 보고했다가 정정한 전례가 있다(하네스만 있고 요구된 테스트 커버리지가 없었고, 모달만 됐고 표 접근성은 미비했다).
