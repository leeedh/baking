# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Atelier Crème** (`atelier-creme`) — a French-baking masterclass (VOD) platform. Next.js 15 App Router + Supabase (Auth/DB/Storage/RLS) + Mux (signed video) + TossPayments v2 (KRW settlement). Bilingual: Korean (`ko`, default) and English (`en`). Code comments and user-facing copy are Korean.

## Commands

Package manager is **pnpm** (enforced by `vercel.json` and the `pnpm` block in `package.json`).

- `pnpm dev` — dev server on **port 3000** (payment/origin guards assume `http://localhost:3000`)
- `pnpm build` / `pnpm start`
- `pnpm lint` — Biome check. **주의: 커밋된 파일이 CRLF라 리포 전체에서 `format` 에러로 실패한다(main도 동일, pre-existing).** 신규 코드 검증은 `pnpm typecheck`에 의존하고, lint는 변경 파일만 개별 확인.
- `pnpm typecheck` — `tsc --noEmit`
- Database: migrations live in `supabase/migrations/` (timestamped). 원격 프로젝트는 **`sowoo` = `ptwgrmdtzdphervuanxi`**. 로컬 Docker가 없어 Supabase **MCP**로 운영: `apply_migration`(DDL) 후 `generate_typescript_types`로 `supabase/database.types.ts` 재생성. **주의: MCP `execute_sql`의 쓰기(INSERT/UPDATE/DELETE)는 하네스 안전 분류기가 차단**하므로 데이터 시드/변경은 앱 플로우로 하거나 사용자에게 요청. `createServerClient<Database>`가 타입에 의존하므로 스키마 변경 후 재생성 필수.

There is **no test suite** in this repo.

## Architecture — the parts that span files

### Auth & trust boundary (read before touching anything under `src/app/api` or `src/lib/supabase`)
Two Supabase clients, deliberately separate:
- `lib/supabase/server.ts` `createClient()` — request-scoped, reads the user session from cookies, **subject to RLS**. Use for all normal reads. `getUser()` / `getProfile()` (role) are helpers here.
- `lib/supabase/admin.ts` `createAdminClient()` — `service_role`, **bypasses RLS**. Guarded by `import 'server-only'`. Use *only* for server-authoritative writes (order completion, enrollment grants, admin console mutations).

Because `service_role` bypasses RLS, **RLS is never the sole gate**. Admin API routes must call `requireAdmin()` (`lib/auth/require-admin.ts`) at the app layer; the DB `is_admin()` RLS is only a backstop. Sensitive reads use **double defense**: RLS gates the row (e.g. `lessons_select_guarded`) *and* the route re-checks access (e.g. `has_course_access()` RPC in the playback route).

`middleware.ts` refreshes the Supabase session cookie on every non-API request and runs next-intl locale routing on the **same** response object. Its `matcher` deliberately excludes `/api` and `/auth` — so route handlers get **no** middleware auth/CSRF protection and must guard themselves.

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

## Docs & a documentation gotcha
Design docs are in `Docs/` (`PRD.md`, `TechSpec.md`, `DBSchema.md`, `UXGuide.md`) and API/security items are traceable by `TS-*` codes (e.g. `TS-API-10`, `TS-SEC-02`) referenced in route comments.

**`TechSpec.md` is the "to-be" target spec, not as-built.** It lists TanStack Query and Zustand, but the actual app installs neither — server state is plain RSC fetching and there is no global client store yet. Trust the code over the spec for what's actually wired up.

## Jira
이슈 추적은 **`claude.ai Atlassian Rovo` 커넥터**(cloudId `7cb9460c-4bd1-42dc-9f05-491aa11178dd`), 프로젝트 **`DC`(dessert Class)**. 다른 `mcp-atlassian` 커넥터는 접근 가능한 프로젝트가 없으니 쓰지 말 것. Jira의 EPIC/작업(DC-*)은 `Docs/plan.md`의 EPIC과 대응된다.
