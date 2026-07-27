# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Atelier Crème** (`atelier-creme`) — a French-baking masterclass (VOD) platform. Next.js 15 App Router + Supabase (Auth/DB/Storage/RLS) + Mux (signed video) + TossPayments v2 (KRW settlement). Bilingual: Korean (`ko`, default) and English (`en`). Code comments and user-facing copy are Korean.

## Commands

Package manager is **pnpm** (enforced by `vercel.json` and the `pnpm` block in `package.json`).

- `pnpm dev` — dev server on **port 3000** (payment/origin guards assume `http://localhost:3000`)
- `pnpm build` / `pnpm start`
- `pnpm lint` — Biome check (lint + format lint). `pnpm format` to auto-fix.
- `pnpm typecheck` — `tsc --noEmit`
- Database: migrations live in `supabase/migrations/` (timestamped). Apply with the Supabase CLI (`supabase db push` / `supabase db reset`). After schema changes, regenerate `supabase/database.types.ts` — the whole app is typed against it via `createServerClient<Database>`.

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

The webhook (`payments/webhook/route.ts`, `TS-API-11`) is the completion path for async methods (e.g. virtual accounts) and a recovery path when confirm left an order `pending` **or `failed`** (Toss may have approved after confirm hit a transient error). It never trusts the payload — it re-fetches the payment from Toss by `paymentKey`. Both confirm and the webhook call the shared `completePaidOrder` (`lib/payments/orders.ts`), which is idempotent: the `orders` update is guarded by `.in('status', ['pending','failed'])` and re-`select()`ed so only one caller is the real transitioner (coupon increments key off that), and `grant_enrollment` is unique on `order_id`. It also maps `CANCELED`→`refunded`/`canceled` on the order and enrollments.

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
