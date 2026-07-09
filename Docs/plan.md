# Atelier Crème — 남은 작업 계획 (Implementation Plan)

> **작성일**: 2026-07-08 · **개정**: 2026-07-08 (EPIC-A 이관 완료 + EPIC-B 착수 반영)
> **기준 문서**: PRD v1.1(정본) · TechSpec v1.1(정본) · DBSchema v1.0(정본) · UXGuide v2.0(as-built)
> **목적**: 가이드 문서(목표 스펙)와 현재 코드(`src/`)를 비교해 **남은 구현 작업**을 정리한다.
>
> 📐 **문서 관계**: PRD·TechSpec·DBSchema는 **정본(to-be)**, UXGuide는 **현재 프로토타입의 as-built 기록**이다. 따라서 아래 갭은 **결함이 아니라 정본이 정의한 예정 작업**이다.
>
> 🗓 **진행 이력**:
> - 2026-07-08 **EPIC-A 완료** — Vite SPA → Next.js 15 App Router 이관(`feat/nextjs-migration`, 커밋 `e5f2efb`). 9개 화면 라우트화, next-intl `/[locale]` 골격, Zustand 목업 스토어, GSAP `ssr:false`+reduced-motion, pnpm+Biome 전환.
> - 2026-07-08 **EPIC-B 착수** — Supabase 스키마(10테이블·함수·트리거·뷰·RLS) 마이그레이션 작성 + `sowoo` 프로젝트(`ptwgrmdtzdphervuanxi`)에 적용·검증.

---

## 0. 현황 요약 (Executive Summary)

| 구분 | 가이드 문서(목표) | 현재 코드(as-built) |
|------|------------------|--------------------|
| 프레임워크 | Next.js 15 App Router (SSR/RSC/ISR) | ✅ **Next.js 15 App Router** (이관 완료, `/[locale]` 라우팅) |
| 백엔드/DB | Supabase (Postgres + Auth + Storage + RLS) | 🔄 **스키마 적용됨**(EPIC-B) — 10테이블·RLS·함수·뷰 `sowoo` 프로젝트에 생성. 프런트 연동은 EPIC-C~G |
| 인증 | Supabase Auth (이메일+OAuth, role) | **목업** — Zustand 스토어(항상 로그인, 하드코딩 이메일) |
| 결제 | TossPayments 서버검증+Webhook 멱등 | **목업** — 1.5s `setTimeout` + `alert` |
| 영상 | Mux 서명 재생 URL + 워터마크 | **네이티브 `<video>`** + 샘플 mp4, 보안 없음 |
| 진도/수강권 | DB `progress`/`enrollments` + RLS | **Zustand state** (배열) — DB 테이블은 생성됨, 연동 전 |
| i18n | next-intl 라우팅 기반 | 🔄 **next-intl 골격 완료**(`/ko`·`/en`, ~40키 이전). 나머지 KO 하드코딩은 EPIC-K |
| 화면 UI | 9개 화면 스펙(도서 F-19·강사 F-18 정본 편입) | ✅ **9개 화면 라우트화 완료**, 반응형 ✅ |

> ℹ️ **스택은 정본과 일치**: Tailwind CSS **4.x**(`@theme` 토큰)와 **GSAP + ScrollTrigger**(히어로 줌 리빌, `MeringueHero` = TS-COMP-S6)는 TechSpec §1 정본 스택 → 이관 후에도 유지(GSAP는 `ssr:false`+reduced-motion 가드 적용됨).

**결론**: 프레임워크 이관(EPIC-A)과 데이터 스키마(EPIC-B)가 완료되어 "UI 프로토타입 → 풀스택 제품" 전환의 **기반이 마련됐다**. 남은 핵심은 스키마 위에 **인증·결제·영상보안(EPIC-C/D/E)을 얹어 목업을 실데이터로 교체**하는 것이다.

---

## 1. 갭 분석 (Gap Matrix)

기능 영역별 목표 스펙 대비 현재 상태와 남은 작업.

| 영역 | 스펙 ID | 현재 | 갭(남은 작업) |
|------|---------|------|--------------|
| 다국어 i18n | PRD-F-01, TS-ADR-07 | ✅ next-intl 골격 완료(`/ko`·`/en`, ~40키 이전, Header·Hero·Catalog 적용). 나머지 화면 KO 하드코딩 | **전 문자열 메시지화(EPIC-K)**, 통화/날짜 로케일 포맷 |
| 카탈로그·상세·미리보기 | PRD-F-02 | UI 완성, 목업 데이터(Zustand). **DB 테이블 생성됨** | Supabase 데이터 연동(`course_catalog` 뷰), `is_preview` 게이팅 서버화 |
| 강사 소개 | PRD-F-18, TS-COMP-12 | UI 완성(`InstructorScreen`), KO 하드코딩 | 정적 콘텐츠 i18n화 + 정본 라우팅(`features/instructor`) |
| 도서 상품 | PRD-F-19, TS-COMP-11, DB-T-10 | UI 완성(`BooksScreen`) + 가짜 `alert()` 구매 | **외부 커머스 링크(`external_purchase_url`) 전환**, `books` 데이터 연동(자체 결제·배송 없음) |
| 쿠폰 할인 | PRD-F-04, TS-ADR-08, DB-T-09 | 클라 계산(`BAKING10` ₩15,000 정액) | `coupons` 테이블 + **서버 할인 산출·검증** |
| 통화 현지화 | PRD-NF-06, TS-ADR-05 | `₩` 단일 표기 | KRW 청구 + `≈ NT$` 참고가 병기(`<PriceTag/>`) |
| 회원 인증 | PRD-F-03 | 목업 로그인 | Supabase Auth(이메일+Google/Apple), role, 세션 |
| 결제 | PRD-F-04/04.1/04.2 | 목업 | TossPayments 결제창, 서버 검증, Webhook 멱등 |
| 수강권(영구) | PRD-F-05 | state 배열 | `enrollments` 테이블 + `grant_enrollment` 멱등 발급 |
| 보안 영상 | PRD-F-06/06.1/06.2 | 네이티브 video | Mux Player, 서명 JWT, 워터마크, 다운로드 방어 |
| 플레이어·진도 | PRD-F-07 | 로컬 카운트 | `progress` upsert(디바운스), 이어보기 위치 복원 |
| 운영자 콘텐츠 관리 | PRD-F-08 | 목업 CRUD | 실제 CRUD + Mux 업로드 + 가격/공개 설정 |
| 레시피 자료 | PRD-F-09 | 목업 토스트 | `materials` + Storage 서명 URL(수강권 게이팅) |
| 후기·평점 | PRD-F-10 | 읽기 전용 목업 | `reviews` 작성(수강자 한정) + 집계 |
| 운영 대시보드 | PRD-F-11 | 목업 KPI | `admin_course_sales` 뷰 기반 실집계 |
| 환불 | PRD-F-12 | 없음 | 주문 취소 + `enrollment.status='refunded'` 흐름 |
| 접근성 | PRD-NF-08 | 초기 수준 | WCAG AA(포커스/키보드/SR/대비/reduced-motion) |
| 성능 | PRD-NF-01/02 | 클라 렌더 | SSG/ISR, TanStack Query, DB 인덱스 |
| 관측성 | TS §6.4 | 없음 | Sentry, Supabase Logs, 분석 이벤트(M-01~05) |

---

## 2. 남은 작업 — Epic 단위

각 Epic은 우선순위(P0=출시 필수 / P1=출시 직후 / P2=v1.1+)와 참조 ID를 포함.

### EPIC-A · 플랫폼 기반 마이그레이션 (P0) — ✅ **완료** (2026-07-08)
- ✅ Next.js 15 App Router 이관, `/[locale]` 라우팅(next-intl), 9개 화면 라우트화(`src/app/[locale]/*`).
- ✅ 전역 state → Zustand 목업 스토어(`src/lib/store.ts`), GSAP `ssr:false`+reduced-motion, pnpm+Biome.
- **재배치 결정**: `features/*` 모듈 재배치는 리프트&시프트 원칙상 **의도적 보류**(현 `components/` 평면 유지 — 백엔드 Epic 착수 시 재검토). lib 초기화(`supabase/mux/toss/sentry`)는 EPIC-A에 몰지 않고 **각 소비 Epic으로 재배치**: supabase→EPIC-B, mux→EPIC-E, toss→EPIC-D, sentry→EPIC-I(첫 소비 시점에 생성해 빈 파일 방지).
- **참조**: TS-ADR-01/07, TS §2.4, TS-COMP-10

### EPIC-B · 데이터 레이어 (P0) — ✅ **스키마 적용 완료** (2026-07-08, `sowoo`=`ptwgrmdtzdphervuanxi`)
- ✅ **10개 테이블**·enum(CHECK)·인덱스(DB-IDX-01~15) 생성 (DB-MIG-01). `coupons`(DB-T-09)·`books`(DB-T-10) 포함.
- ✅ `courses` 신규 컬럼(`list_price_krw`·`category`·`level`·`tags`·`instructor_title`), `lessons` 챕터 비정규화(`chapter_index`·`chapter_title`).
- ✅ 함수/트리거/뷰: `is_admin`·`has_course_access`·`grant_enrollment`(멱등)·`set_updated_at`·`handle_new_user`·`admin_course_sales` + 신설 **`course_catalog` 뷰**(파생지표 `rating`/`review_count`/`students_count`/`duration_sec` 집계, `security_invoker`로 published만 노출) (DB-MIG-02).
- ✅ 전체 RLS 정책(DB-MIG-03). `coupons` 서버 전용, `books`/`courses` public-read.
- ✅ 목업 `data.ts` → `supabase/seed.sql`(3개 클래스·커리큘럼·4후기·BAKING10 쿠폰·2도서 + 시드 계정 5). 로컬 마이그레이션 파일은 `supabase/migrations/`(4개)에 버전 관리, TS 타입은 `supabase/database.types.ts`.
- ✅ **하드닝(DB-MIG-04)**: `grant_enrollment`/`handle_new_user` RPC 실행권한 회수(자가발급 방지), `set_updated_at` search_path 고정, RLS `auth.uid()`→`(select …)` 최적화. **검증 완료**(원격 `sowoo`): 멱등 발급·`has_course_access`·`is_admin` 통과, `course_catalog` anon=published만(draft 미노출).
- **잔여 advisor(수용/이연)**: `course_catalog`는 의도적 SECURITY DEFINER(published 공개집계 목적, draft·PII 미노출 검증됨) → ERROR지만 수용. `is_admin`/`has_course_access` RPC 노출은 RLS 평가에 필요해 유지(WARN). Auth "leaked password protection"은 프로젝트 설정 토글 → EPIC-C에서 활성화 권장. admin `for all` 중복정책 WARN은 DBSchema 정본과 일치.
- **비고**: `books`는 `orders`/`enrollments`와 **연결하지 않는다**(내부 판매 아님). `lessons.mux_playback_id`는 NULL(EPIC-E 전까지 실영상 없음, 의도된 갭).
- **남은 것**: 프런트엔드 화면의 실제 Supabase 쿼리 연동 → EPIC-C~G에서 진행. Supabase JS 클라이언트(`src/lib/supabase/*`)는 EPIC-C 착수 시 생성.
- **참조**: DBSchema 전체, TS-ADR-02

### EPIC-C · 인증 (P0)
- Supabase Auth 이메일 + OAuth(Google/Apple), 세션 관리, `profiles` 자동 생성 트리거.
- role(student/admin) 기반 라우팅 가드(운영자 콘솔 보호).
- 현재 `App.tsx`의 목업 로그인 state 제거.
- **참조**: PRD-F-03, TS-COMP-02, DB-T-01, DB-TRG-01

### EPIC-D · 결제 → 수강권 (P0)
- TossPayments v2 결제창(수단 분기: 국내카드/해외카드/간편결제), KRW 단일 MID.
- Route Handler `POST /api/payments/confirm` — 금액·상태 서버 재검증 → `grant_enrollment`.
- **쿠폰 서버 계산(TS-ADR-08)**: 쿠폰 코드를 서버로 전달, 서버가 `coupons`(DB-T-09) 근거로 유효성·할인액 산출 → `amount_krw`를 Toss 승인·검증 기준값으로 사용. 클라 계산(`BAKING10`)은 표시용에 불과(클라 조작 시 금액 재검증에서 거부).
- **통화 현지화(TS-ADR-05)**: 청구는 KRW 단일, 대만/EN 로케일 화면엔 `≈ NT$` 참고가 병기(비청구 근사값).
- `POST /api/payments/webhook` — 서명 검증 + 멱등(가상계좌 등 비동기 보완).
- 완료 후 `enrollments` 발급 → 내 클래스.
- **참조**: PRD-F-04/04.1, PRD-NF-06, TS-ADR-05/08, TS-API-10/11/20, DB-T-05/06/09
- **비고**: 현재 `PaymentScreen`의 UI/쿠폰/약관 흐름은 재사용 가능(쿠폰 계산만 서버로 이관).

### EPIC-E · 보안 영상 재생 (P0)
- `@mux/mux-player-react` 도입, `POST /api/video/playback-token`(수강권 확인 후 서명 JWT).
- `<WatermarkOverlay>` — 사용자 식별자 부분 마스킹(`j***@e***`) 오버레이.
- 다운로드/우클릭 방어, 비구매자 `is_preview` 차시만 재생.
- 진도 저장: `timeupdate` 디바운스(~10s) → `progress` upsert, 이어보기 위치 복원.
- 현재 `PlayerScreen`의 UI(사이드바·진도바·PDF·노트)는 유지, 영상 코어만 교체.
- **참조**: PRD-F-06/06.1/06.2/07, TS-ADR-03/04, TS-API-12, TS-COMP-S1/S2, DB-T-07

### EPIC-F · 운영자 콘솔 실동작 (P1)
- 클래스/차시 CRUD, Mux 업로드, 가격·공개(status) 설정, 자료 첨부.
- KPI를 `admin_course_sales` 뷰로 실집계(현재 목업 KPI 대체).
- 현재 `DashboardScreen`의 테이블/모달/인라인 편집 UI 재사용.
- **참조**: PRD-F-08/F-11, TS-COMP-06/09, DB-V-01

### EPIC-G · 자료·후기 (P1)
- 자료: `materials` + Storage 서명 URL 다운로드(수강권 게이팅). 현재 목업 PDF 토스트 대체.
- 후기: `reviews` 작성(수강자 한정, 별점 1~5, 클래스당 1건) + 공개 읽기 + 집계 반영.
- **참조**: PRD-F-09/F-10, TS-API-05/13, DB-T-04/08

### EPIC-L · 도서·강사 소개 (P1) — *프로토타입 화면의 정본화*
- **도서(PRD-F-19)**: `BooksScreen`의 가짜 `alert()` 구매를 **외부 커머스(네이버쇼핑·쿠팡) `external_purchase_url` 새 탭 이동**으로 교체. `books`(DB-T-10) 데이터 연동(소수·정적이면 앱 상수/CMS도 가능). "실물 배송" 문구 → 외부 커머스 안내로 조정. 자체 결제·재고·배송 없음.
- **강사(PRD-F-18)**: `InstructorScreen`(연혁·철학·Q&A)을 정본 라우팅(`features/instructor`)에 편입 + 정적 콘텐츠 i18n화. 단일 브랜드(대표 파티시에) 신뢰 형성 목적.
- **참조**: PRD-F-18/F-19, TS-COMP-11/12, DB-T-10

### EPIC-H · 환불 (P1)
- 주문 취소 → `orders.status` 전이 + `enrollments.status='refunded'`(하드삭제 X) → `has_course_access` 자동 차단.
- **참조**: PRD-F-12, DB-T-06 비고

### EPIC-I · Cross-cutting 품질 (P0~P1)
- **접근성(P1)**: 포커스 관리/트랩, 플레이어 키보드 단축키, `aria-live`/`th scope`, 색 대비, `prefers-reduced-motion`, `alert()` → 토스트. (UXGuide §6.2 과제)
- **성능(P0)**: 카탈로그 SSG/ISR, TanStack Query 캐싱, DB 인덱스/RLS 최적화.
- **에러(P0)**: RFC 7807 응답, Error Boundary, 결제 실패 사유별 다국어 메시지.
- **보안(P0)**: Zod 입력검증(모든 Route Handler), 시크릿 서버 전용 분리.
- **관측성(P1)**: Sentry, Supabase Logs, 분석 이벤트(PRD-M-01~05).
- **참조**: PRD-NF-01/02/08, TS §6

### EPIC-J · 개발 인프라 (P0 병행)
- ✅ **pnpm, Biome** 전환 완료(EPIC-A). ✅ Supabase CLI 마이그레이션 구조(`supabase/migrations/`) 도입(EPIC-B).
- 🔲 남은 것: Husky+lint-staged, Vitest(단위) + Playwright(결제·시청 E2E), CI/CD 파이프라인, Vercel 환경 분리.
- **참조**: TS §1.4, §7

### EPIC-K · i18n 완성 (P1)
- 현재 `t()` 실적용은 3개 컴포넌트(Header·MeringueHero·CatalogScreen)뿐, `translations` 키 ~30개. 상세·결제·플레이어·로그인·도서·강사 화면은 KO 하드코딩 → **전면 메시지화**.
- 통화 현지화: KRW 청구 + 대만/EN 로케일 `≈ NT$` 참고가 병기(EPIC-D 통화 현지화와 연계)·날짜 로케일 포맷.
- zh-CN 확장 구조 준비(값은 v1.1).
- **참조**: PRD-F-01, PRD-NF-06, TS-ADR-05/07

---

## 3. 데이터 모델 정합성 정리 (병행 필요)

현재 `src/types.ts`·`data.ts`가 DBSchema와 구조가 다르므로 이관 시 매핑 필요.

| 현재(프로토타입) | 스펙(DB) | 조치 |
|------------------|---------|------|
| `ClassItem.instructor: string` | 단일 브랜드 상수(`courses`에 강사명 미저장, `instructor_title` jsonb만) | 강사명 문자열 → 브랜드 고정 상수 |
| `ClassItem.level 초급/중급/상급`, `category`, `tags` | `courses`에 `level`·`category`·`tags`·`instructor_title` 컬럼 **정본 추가됨** | 매핑 단순화(구조 정합) |
| `originalPrice`(취소선) | `courses.list_price_krw` **정본 추가됨** | 직결 매핑 |
| `CurriculumChapter/Lesson` 2계층 | `lessons.chapter_index`·`chapter_title` **비정규화(정본 확정)** | 별도 `chapters` 테이블 불필요(부가속성 필요 시 승격) |
| `Review.userName/avatar` | `reviews`(user_id FK) | profiles 조인으로 대체 |
| 카드/상세 `rating`·`students`·`duration` | 컬럼 아님 → **뷰/집계로 파생(정본 확정)** | `course_catalog` 뷰 또는 캐시 컬럼 |
| ~~`CLASS_MANAGEMENT_DATA` 강사 불일치~~ | 카탈로그 "민소희" 단일 | ✅ **해소 완료** — `data.ts` 강사명 전부 "민소희"로 수정됨 |

> ℹ️ 이전 갭이던 대시보드 강사명 브랜드 불일치("엘리제 뒤퐁/장-뤽 마르탱")는 `src/data.ts` 수정으로 **이미 해결**됐다. 챕터 표현·파생지표 처리도 정본에서 설계 결정이 확정되어 남은 것은 이관 시 구조 매핑뿐이다.

---

## 4. 권장 실행 순서 (PRD Phased Rollout 정렬)

| 단계 | 포함 Epic | 산출 | PRD 단계 |
|------|-----------|------|---------|
| **1. 기반** | ✅ A · ✅ B · 🔄 J | Next.js 이관 ✅ + Supabase 스키마 ✅ + (CI 등 J 잔여) | (사전) |
| **2. Alpha** | **C**(다음), D, E + I(성능/에러/보안) | 인증·결제·보안시청 핵심 흐름 | PRD-P-01 (Week 4) |
| **3. Beta** | F, G, K, L | 운영콘솔·자료·후기·i18n·도서·강사 완성 | PRD-P-02 (Week 8) |
| **4. GA** | H, I(접근성/관측성) 마감 | 환불·품질·모니터링, M-01 달성 | PRD-P-03 (Week 12) |
| **5. v1.1** | 중국결제/zh-CN/DRM | 확장 | PRD-P-04 |

**v1.1+ (범위 밖, 참고)**: 알리페이·위챗(PRD-F-13), zh-CN(F-14), GFW 대응(F-15), 구독·번들(F-16), 정식 DRM(F-17).

---

## 5. 선결 결정 사항 (Open Decisions)

1. ~~**아키텍처 경로**~~ → ✅ **해소**: Next.js 15 App Router 이관 완료(EPIC-A).
2. **범위/속도** — 프레임워크→데이터→인증 순으로 진행 중. 다음은 EPIC-C(인증).
3. **결제 계정** — TossPayments 가맹(해외카드 MID) 준비 상태. → EPIC-D 착수 전 필요.
4. ~~**Supabase 계정**~~ → ✅ **해소**: `sowoo` 프로젝트(`ptwgrmdtzdphervuanxi`)에 스키마 적용. **Mux 계정**은 EPIC-E 착수 전 필요(별도 미해결). 로컬 검증용 Docker는 미설치(2026-07-08 확인) — 원격 프로젝트로 대체 검증 중.
5. **도서 외부 커머스 URL** — 네이버쇼핑/쿠팡 실제 판매 링크 미확보. `books.external_purchase_url`은 현재 시드에 **플레이스홀더**로 입력됨 → 실값 확보 후 갱신 필요.
6. **관리자 계정** — 시드의 `admin@ateliercreme.com`은 로컬 검증용. 실제 운영자 이메일 확정 필요(EPIC-C).

> ✅ 기존 "프로토타입 데이터 정리(브랜드 불일치)" 결정 항목은 `data.ts` 수정으로 **해소**됨.

---

## 6. 참고 — 현재 잘 갖춰진 자산 (재사용 가능)

- 9개 화면의 완성도 높은 UI·에디토리얼 디자인, 모바일 반응형(최근 수정 완료).
- `PaymentScreen`(쿠폰·약관·요약), `PlayerScreen`(사이드바·진도바·노트), `DashboardScreen`(KPI·테이블·모달), `BooksScreen`(도서 카드), `InstructorScreen`(강사 소개) 등은 **UI 골격을 그대로 두고 데이터/로직만 실연동**하면 되는 구조(도서는 구매 CTA만 외부 링크로 교체).
- 디자인 토큰(`src/app/globals.css @theme`, Tailwind 4.x), GSAP 히어로 인터랙션(`MeringueHero`, `ssr:false`).
- **next-intl 골격**(`src/i18n/*`, `messages/{ko,en}.json`) — EPIC-K에서 전 화면 메시지 확장.
- **Zustand 목업 스토어**(`src/lib/store.ts`) — EPIC-C(인증)에서 실제 Supabase 세션으로, 구매/진도는 EPIC-D/E에서 실 테이블로 교체할 자리.
- **Supabase 스키마**(`supabase/migrations/*`, `supabase/seed.sql`) — `data.ts` 목업이 시드로 이전됨. EPIC-C~G에서 프런트 쿼리 연동.

---

*EPIC-A·B 완료. 다음 착수 권장: **EPIC-C(인증)** — Supabase Auth + `profiles` + role 가드로 Zustand 목업 로그인 대체.*
