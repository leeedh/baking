# Atelier Crème 베이킹 클래스 플랫폼 UI/UX Guide

> **버전**: v2.0 (as-built 동기화)
> **브랜드**: Atelier Crème — Premium French Baking Atelier
> **대표 파티시에**: 민소희 (Sohee Min)
> **플랫폼**: 반응형 웹 SPA (Mobile-first) · KO/EN 다국어 · **Light 전용**
> **스택**: React + TypeScript + Vite · Tailwind CSS v4 · lucide-react · GSAP(ScrollTrigger)
> **상태**: 프론트엔드 프로토타입 (데이터·결제·영상은 목업/샘플)

> 📐 **문서 역할**: 본 문서는 **현재 프로토타입의 as-built 기록**이다(현행 `Vite + React SPA` 껍데기 기준). **목표 스펙(to-be)은 정본인 `TechSpec.md`·`PRD.md`·`DBSchema.md`를 참조.** 백엔드(Supabase/Mux/TossPayments), 라우팅(Next.js `[locale]`), 다크 테마 등은 현재 구현에 없으며 §7.3 "향후 과제"로 표기한다 — 이는 결함이 아니라 **정본이 정의한 예정 작업**이다.

---

## §1. Design System

### 1.1 Design Principles

1. **Warm & Crafted (따뜻한 수공예감)** — 디저트 아티스트 브랜드의 손맛을 화면에 담는다. 차가운 SaaS 그레이 대신 크림 페이퍼·카라멜·테라코타 톤.
2. **Editorial Luxury (에디토리얼 럭셔리)** — Fraunces 세리프 헤드라인과 여백, 히어로의 GSAP 줌 리빌로 파티스리 매거진 무드를 연출한다.
3. **Own Forever, Feel It (영구 소장의 가치)** — 단건 구매·평생 소장권을 배지·문구("평생 무제한 소장", "LIFETIME ACCESS PASS")로 반복 인지시킨다.
4. **Glanceable Progress (한눈에 진도)** — 플레이어·내 클래스에서 진도율을 ProgressBar로 즉시 보이게 한다.
5. **Bilingual by Default (다국어 기본값)** — 헤더 KO/EN 토글(`LanguageContext`)로 전환. 대만(繁體中文) 수강생을 겨냥한 카피·후기 포함, 통화는 KRW 단일 표기.
   > ⚠️ **현황 주의**: 실제 `t()` 적용은 부분적이다 — `useLanguage`를 쓰는 컴포넌트는 **11개 중 2~3개**(`Header`·`MeringueHero`·`CatalogScreen` 일부)뿐이고, `translations` 키는 ~30개. 상세·결제·플레이어·로그인·도서·강사 화면은 **한국어 하드코딩**이라 EN 토글해도 바뀌지 않는다. 정본(TechSpec `next-intl`) 이관 시 전 문자열 메시지화 필요.

### 1.2 Color Tokens

**실제 정의 위치**: `src/index.css`의 `@theme` 블록. Light 전용, 6개 코어 토큰 + 흰색 표면.

| 토큰 (Tailwind) | HEX | 용도 |
|------|------|------|
| `--color-cream` / `bg-[#FAF4EA]` | `#FAF4EA` | 페이지 배경(크림 페이퍼) |
| `surface` / `bg-white` | `#FFFFFF` | 카드·패널·모달 |
| `--color-brown` / `text-[#2A211B]` | `#2A211B` | 주 텍스트·푸터 배경(에스프레소) |
| `--color-brown-medium` / `text-[#5F4E43]` | `#5F4E43` | 보조 텍스트 |
| `--color-brown-light` / `border-[#EFE8DC]` | `#EFE8DC` | 구분선·테두리·연한 표면 |
| `--color-terracotta` / `text-[#B65538]` | `#B65538` | CTA·브랜드 강조(카라멜 테라코타) |
| `--color-gold` / `text-[#B0863C]` | `#B0863C` | 액센트(평점·영구 배지·라벨) |

**하드코딩 hover/보조 색상** (토큰화되지 않고 유틸리티로 직접 사용):
- 테라코타 hover(**실측 5종**): `#A14328`(4회) · `#A0452C`(3회) · `#9C3F24`(2회) · `#9E3E23`(1회) · `#9E2D1B`(1회)
- 골드 hover(**실측 4종**): `#B0863C`(3회) · `#9a7432`(2회) · `#9A7230`(1회) · `#B1863C`(1회, 오타 추정)
- 상태색: 완료 `emerald-600/700`, 정보 `sky-700`, 경고 토스트 `amber-50/200/900`

> ⚠️ **개선 포인트**: 테라코타 hover 5종·골드 hover 4종이 파일마다 제각각이다(`#B1863C`는 `#B0863C` 오타로 추정). 각각 단일 `brand-deep`·`gold-deep` 토큰으로 통일 권장.
> ℹ️ 다크 테마·`success/danger/info` 시맨틱 토큰은 **미구현**.

### 1.3 Typography

| 용도 | 폰트 | 비고 |
|------|------|------|
| Display / Heading | **Fraunces** (`font-serif`) | 히어로·섹션 제목·가격·수치. Google Fonts import |
| 본문 / UI / 한글 | **Pretendard** (`font-sans`) | jsdelivr CDN import. KO/EN 가독성 |
| Mono(수치·코드) | 시스템 모노 (`font-mono`) | 가격·타이머·ID. **JetBrains Mono 미사용** |

- 크기는 토큰 테이블이 아닌 **Tailwind 유틸리티**로 직접 지정(`text-xs` ~ `text-3xl/5xl` 등).
- 히어로 대형 헤드라인은 `font-serif text-3xl sm:text-5xl` 계열, 섹션 제목은 `text-3xl sm:text-4xl`.
- ⚠️ 초소형 폰트(`text-[8px]`~`text-[11px]`) 다수 사용 — 가독성 개선 여지 있음.

### 1.4 Spacing

- **Tailwind 기본 4px 스케일** 사용(`gap-2/3/4/6/8`, `p-4/5/6/10`, `py-6/8/10/12`).
- 별도 커스텀 spacing 토큰은 정의하지 않음.

### 1.5 Radius / Shadow

| 클래스 | 값 | 용도 |
|------|-----|------|
| `rounded-lg` | 8px | 버튼·입력·칩 |
| `rounded-xl` | 12px | 카드·KPI·결제 옵션 |
| `rounded-2xl` | 16px | 큰 카드·플레이어·로그인 카드 |
| `rounded-3xl` | 24px | 히어로·강조 패널 |
| `rounded-full` | 9999px | 아바타·언어 토글·히어로 CTA·배지 |
| `shadow-sm` / `shadow-md` / `shadow-lg` / `shadow-xl` | Tailwind 기본 | 카드→hover→모달/플로팅 |

- 커스텀 그림자 예: 상세 sticky 바 `shadow-[0_-8px_20px_rgba(42,33,27,0.08)]`.

### 1.6 Motion

- **GSAP + ScrollTrigger**: `MeringueHero`의 스크롤 연동 케이크 줌인/마스크 리빌·텍스트 크로스페이드(핵심 인터랙션).
- **Tailwind transition**: hover(`transition-all/colors/transform`, ~150–300ms), `hover:-translate-y-0.5`, `hover:scale-[1.01]`.
- **커스텀 keyframes**: `index.css`의 `@keyframes mouseScroll`(히어로 스크롤 힌트).
- ⚠️ `prefers-reduced-motion` 대응은 **미구현**.

---

## §2. Layout & Responsive

### 2.1 Breakpoints (Tailwind 기본)

| 접두사 | min-width | 용도 |
|------|-----------|------|
| (base) | 0 | 모바일 기본 |
| `sm` | 640px | 큰 폰·세로 태블릿 |
| `md` | 768px | 태블릿 · 데스크톱 네비 전환점 |
| `lg` | 1024px | 노트북 · 플레이어/상세 사이드바 노출 |
| `xl` | 1280px | 데스크톱 |

- **콘텐츠 최대 폭**: `max-w-7xl`(1280px) — 결제만 `max-w-5xl`, 로그인 `max-w-md`.
- **모바일 네비 전환**: `md`(768px) 미만에서 햄버거 메뉴. (문서 v1의 360/768/1024/1440 커스텀 BP는 폐기)

### 2.2 Grid System

- **코스 그리드**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
- **상세/플레이어**: `lg:grid-cols-12`(메인 8 + 사이드바 4). `lg` 미만은 세로 스택.
- **KPI 그리드**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.
- **결제**: `lg:grid-cols-3`(폼 2 + 요약 1), 모바일 스택 + 하단 요약.

### 2.3 앱 셸 구조

현재 앱은 **라우터 없는 단일 페이지(SPA)**로, `App.tsx`의 `currentView` 상태로 화면을 전환한다(`window.scrollTo`로 상단 이동).

```
<div flex flex-col min-h-screen>
  <Header sticky top-0 z-40 />      // 브랜드 + 네비 + 언어토글 + 인증
  <main flex-grow pb-24>            // currentView에 따라 화면 렌더
     login | catalog | detail | payment | player | myclasses | dashboard | books | instructor
  </main>
  <Footer />
</div>
```

- 화면별 컨테이너 공통 패턴: `bg-[#FAF4EA] py-* px-4 sm:px-8 max-w-7xl mx-auto`.

---

## §3. Components

### 3.1 화면 컴포넌트 (`src/components/`)

| 파일 | 역할 |
|------|------|
| `Header.tsx` | 브랜드 로고(원형 "A") + 데스크톱 네비 + 언어 토글(KO/EN) + 인증/프로필 + 모바일 햄버거 패널 |
| `Footer.tsx` | 브랜드·수강 혜택·고객지원 4열(모바일 1열), 지역/언어 안내 |
| `MeringueHero.tsx` | GSAP 스크롤 줌 리빌 히어로(케이크 마스크), 검색창, CTA, 우측 에디토리얼 스탯 패널 |
| `CatalogScreen.tsx` | 히어로 + 공지바 + 베이킹 DNA 퀴즈 + 3-Pillars 철학 + 클래스 그리드 + 수강생 실습 아카이브 + FAQ |
| `DetailScreen.tsx` | 상세(소개/커리큘럼/후기 탭) + 미리보기 + 구매 박스 + 모바일 하단 sticky 결제바 |
| `PaymentScreen.tsx` | 결제 수단 4종 + 쿠폰 + 구매자 정보 + 약관 동의 + 주문 요약 (목업 결제) |
| `PlayerScreen.tsx` | HTML5 `<video>` 플레이어 + 진도율 + 차시 사이드바 + PDF 배합표 + 요약 노트 |
| `MyClassesScreen.tsx` | 평생소장 보관함(구매 클래스 카드/이어보기) + 빈 상태 |
| `DashboardScreen.tsx` | 운영자 KPI 4카드 + 클래스 관리(모바일 카드 / 데스크톱 테이블) + 단가 인라인 편집 + 새 클래스 모달 |
| `BooksScreen.tsx` | 레시피 도서 상점(도서 카드·챕터·혜택·PDF 안내) |
| `InstructorScreen.tsx` | 강사 소개(연혁 타임라인·철학·Q&A·CTA) |

### 3.2 공통 UI 패턴 (원자/분자 수준, 별도 컴포넌트화 없이 유틸리티로 구현)

| 패턴 | 구현 |
|------|------|
| Button (primary) | `bg-[#B65538] text-[#FAF4EA] rounded-lg/xl` + hover 딥테라코타 |
| Button (dark) | `bg-[#2A211B] text-[#FAF4EA]` (헤더 로그인·플레이어 이동 등) |
| Button (ghost/outline) | `border border-[#EFE8DC] text-[#5F4E43]` |
| Badge | 평생소장/무료 맛보기/카테고리 등 `text-[9px]~[11px]` 라운드 칩 |
| PriceTag | `font-serif` 굵게 `₩{price.toLocaleString()}` + 원가 취소선 + 할인율 |
| StarRating | lucide `Star`(display only), `rating` + `(reviewCount)` |
| ProgressBar | `bg-[#B65538] h-full` 트랙 위 진행, 진도율 % |
| LocaleSwitcher | 세그먼트형 KO/EN 토글(헤더) |
| Toast/Alert | 브라우저 `alert()` + 인라인 amber 배너(PDF 다운로드 등) |

> ℹ️ 접근성 속성(`role`, `aria-*`), 포커스 트랩, 키보드 단축키는 **대부분 미구현**(§6 참고).

### 3.3 플레이어 상세 (`PlayerScreen`)

- **영상**: 표준 HTML5 `<video controls>` + 샘플 mp4(`videoUrl`). **Mux/서명 JWT/워터마크 미적용**.
- **접근 제어**: 비구매자는 `isFree` 차시만 시청(그 외 `alert`로 차단). 서버 RLS 아님(클라이언트 가드).
- **진도**: 완료 차시 배열 길이 ÷ 총 차시로 % 계산(로컬 state). 서버 저장·이어보기 위치 복원 없음.
- **부가**: "차시 수강완료" 토글, "PDF 배합표 받기"(목업 토스트), 실습 요약 노트.

---

## §4. Screens

각 화면은 `App.tsx`의 `currentView` 값으로 진입. 공통 컨테이너·헤더·푸터는 §2.3 참조.

### SCR-01 · 로그인 / 회원가입 (`login`)
- **컴포넌트**: `LoginScreen` · **템플릿**: 중앙 카드(`max-w-md`) + 상단 그라데이션 스트립.
- **구성**: 로그인/회원가입 **탭 전환**, 이메일·비밀번호, 소셜 로그인(Google, 모바일 1열), 약관.
- **동작**: 목업 인증 → 성공 시 `onLoginSuccess(email)` → 카탈로그. 에러/성공 메시지 인라인.

### SCR-02 · 클래스 카탈로그 (`catalog`) — 랜딩
- **컴포넌트**: `CatalogScreen` (내부에 `MeringueHero`).
- **섹션 순서**:
  1. **MeringueHero** — GSAP 스크롤 케이크 줌 리빌 + 검색 + CTA + 우측 스탯(42 Masterclasses / 4.9 / 4,800+).
  2. 공지 바(신규/혜택 안내).
  3. **베이킹 DNA 퀴즈** — 레벨·취향 선택 후 추천 클래스 매칭.
  4. **3-Pillars 철학** 섹션.
  5. **클래스 그리드** — 카테고리 필터 탭(전체/정통 프렌치 디저트/클래식 구움과자/모던 타르트) + 검색, 카드 3열. **현재 클래스 3종**.
  6. **수강생 실습 아카이브** — 포토 후기 + 서브 카테고리 탭.
  7. **FAQ 아코디언**.
- **카드**: 썸네일·레벨(초급/중급/상급)·제목·강사·평점·가격(영구)·태그. hover `-translate-y`.

### SCR-03 · 클래스 상세 · 미리보기 (`detail`)
- **컴포넌트**: `DetailScreen`.
- **구성**: 커버/미리보기 영상, 제목·강사·평점·가격 박스(구매/미리보기 CTA), **탭(소개·커리큘럼·후기)**.
- **커리큘럼**: 챕터→차시, `isFree` 차시만 "즉시 시청" 노출, 그 외 잠금 표시.
- **모바일**: 하단 **sticky 결제바**(가격 + 결제/플레이어 이동), `bottom-0` + iOS safe-area 대응.
- **후기**: `REVIEWS_DATA`(KO/繁中 혼합) 평점·내용.

### SCR-04 · 결제 (`payment`)
- **컴포넌트**: `PaymentScreen` (`max-w-5xl`).
- **결제 수단 4종**: 국내 신용카드 / 해외 결제(Visa·Master·JCB, 대만 포함) / 카카오·토스페이 / 라인·애플페이. (**PayPal·TossPayments 실연동 없음**)
- **입력**: 구매자명·연락처, 쿠폰(`BAKING10` → ₩15,000 할인), 약관 동의 체크.
- **동작**: `handlePay` → 1.5s 시뮬레이션 → `onPaymentSuccess` → 내 클래스 + 완료 `alert`.
- **요약**: 상품·가격·할인·합계, KRW 단일.

### SCR-05 · 시청 플레이어 (`player`)
- **컴포넌트**: `PlayerScreen`. 상세는 §3.3.
- **레이아웃**: `lg:grid-cols-12` — 영상 메인(8) + 차시 사이드바(4, 모바일 하단 스택).
- **상단**: 뒤로가기, 강의 제목, 전체 진도율 바.
- **비구매 미리보기**: `isFree` 차시만 재생, 잠금 차시 클릭 시 안내.

### SCR-06 · 내 클래스 (`myclasses`)
- **컴포넌트**: `MyClassesScreen`.
- **구성**: 평생소장 보관함 헤더(소장 개수 배지) + 구매 클래스 카드(영구 배지·이어보기).
- **빈 상태**: `FolderLock` 아이콘 + 추천 맛보기 코스 CTA(긍정형 카피).

### SCR-07 · 운영자 대시보드 (`dashboard`)
- **컴포넌트**: `DashboardScreen`.
- **KPI 4카드**: 당월 유효 매출 / 누적 수강생 / 구매 전환율 / 완주율 (+ 전월 대비 증감).
- **클래스 관리**:
  - **모바일(`md` 미만)**: 카드형 리스트(정가/판매/매출 3분할 + 완주율 바 + 단가 조정).
  - **데스크톱**: 테이블(강의명/셰프/정가/판매수량/매출/완주율/운영행동). **상태(공개/초안) 컬럼 없음**.
  - 단가 **인라인 편집**(저장 시 매출 재계산), **새 클래스 편성등록 모달**, "설비 데이터 갱신" 버튼.
- 데이터: `KPI_DASHBOARD_DATA`, `CLASS_MANAGEMENT_DATA`(목업).

### SCR-08 · 도서 상점 (`books`) — *신규*
- **컴포넌트**: `BooksScreen`.
- **구성**: 레시피 도서 카드(표지·에디션·페이지·챕터 목록·혜택·가격/할인), 소개.
- **구매 방식 (정본, PRD-F-19)**: 자체 결제 없이 **외부 커머스(네이버쇼핑·쿠팡)로 페이지 이동**(`external_purchase_url`, 새 탭). 플랫폼은 소개·유입만 담당.
  > ⚠️ **현황**: 프로토타입은 구매 클릭 시 가짜 `alert()`("구매 승인")로 처리한다 — 외부 링크 이동으로 교체 예정(정본 방향). "실물 배송" 문구도 외부 커머스 안내로 조정.

### SCR-09 · 강사 소개 (`instructor`) — *신규*
- **컴포넌트**: `InstructorScreen`.
- **구성**: 에디토리얼 미니 히어로(셰프 이미지·시그니처 배지), **연혁 타임라인(2016~2025)**, 철학 3종, Q&A, 카탈로그/도서 CTA.

---

## §5. Navigation & Flows

### 5.1 화면 전환 모델
- 라우터가 아닌 `App.tsx`의 `handleNavigate(view, classId?)`로 전환.
  - `detail/player/payment` 진입 시 `selectedClassId` 설정(없으면 마카롱 클래스로 폴백).
  - 전환 시 `window.scrollTo({top:0, behavior:'smooth'})`.
- **인증 가드**: 비로그인 상태에서 구매/내 클래스 진입 시 `login`으로 유도.

### 5.2 핵심 플로우

**FLOW-01 · 발견 → 구매 → 수강**
```
카탈로그(catalog) → 상세(detail) → [로그인?] → 결제(payment)
   → onPaymentSuccess → 내 클래스(myclasses) → 이어보기 → 플레이어(player)
```

**FLOW-02 · 무료 미리보기**
```
상세(detail) → isFree 차시 "즉시 시청" → 플레이어(player, 비구매 미리보기)
```

**FLOW-03 · 운영자 관리**
```
대시보드(dashboard) → 단가 인라인 편집 / 새 클래스 모달 등록
   → onAddNewMockClass로 카탈로그 목록에 반영
```

---

## §6. Interaction & Accessibility

> **현황 요약**: 시각·인터랙션 완성도는 높으나, **정식 접근성(a11y) 구현은 초기 수준**. 아래는 현재 상태와 개선 과제.

### 6.1 구현된 것
- 시맨틱 태그 일부(`<header>`, `<main>`, `<footer>`, `<table>`), 버튼 `title`/일부 `aria-label`(햄버거 등).
- 언어 토글로 KO/EN 전체 전환.
- 모바일 반응형(햄버거, 카드 스택, sticky 바 safe-area, `min-h-[44px]` 탭 타깃 주요 버튼).
- hover/focus 시각 피드백(색·그림자·translate).

### 6.2 개선 과제 (미구현)
- **포커스 관리/트랩**: 모달(새 클래스 등록 등)·미리보기 진입 시 포커스 이동·복귀 없음.
- **키보드 단축키**: 플레이어 Space/←→/F 등 커스텀 제어 없음(네이티브 `<video controls>` 기본만).
- **스크린리더**: 동적 영역 `aria-live`, 테이블 `<th scope>`/`<caption>`, 상태 아이콘 텍스트 대체 부족.
- **색 대비**: 다수 `text-[9px]~[11px]` + 저대비 보조색은 WCAG AA 재검토 필요.
- **Reduced Motion**: `prefers-reduced-motion` 미대응(GSAP 히어로 포함).
- **알림 방식**: `alert()` 남용 → 토스트/인라인 메시지로 대체 권장.

### 6.3 Empty State 카피
- 긍정형 유지: "아직 평생 소장 중인 클래스가 없습니다" + 다음 행동 CTA, "검색어와 부합하는 마스터클래스가 없습니다" 등.

---

## §7. Appendix

### 7.1 디자인 토큰 export
- **현재**: `src/index.css`의 `@theme`에 `--color-*` 6종 + `--font-serif/sans` 정의(Tailwind v4 방식).
- **권장**: 하드코딩된 hex(hover 딥테라코타 등)를 토큰으로 승격, 시맨틱 상태색(success/danger/info) 추가.

### 7.2 다국어
- `src/LanguageContext.tsx`의 `translations` 맵(KO/EN). `t(key)` 헬퍼로 조회, 미존재 시 key 반환.
- 통화는 KRW 단일 표기, 繁體中文은 후기·카피 내 참고 노출.

### 7.3 향후 과제 (문서 v1 → 미구현 항목)
| 항목 | v1 문서 전제 | 현재 구현 |
|------|-------------|-----------|
| 라우팅 | Next.js `/[locale]/*` | 라우터 없는 SPA(state 전환) |
| 데이터/백엔드 | Supabase(RLS, DB 테이블) | 로컬 목업(`data.ts`) |
| 영상 보안 | Mux 서명 JWT + 워터마크 | 네이티브 `<video>`, 보안 없음 |
| 결제 | TossPayments 서버검증·멱등 | 1.5s 시뮬레이션 `alert` |
| 테마 | Light + Dark | Light 전용 |
| 브랜드 | SOWOO / 유아시스 | **Atelier Crème / 민소희** |
| 접근성 | WCAG AA·키보드·SR 완비 | 초기 수준(§6.2 과제) |

### 7.4 화면 ↔ 컴포넌트 매핑
| 화면(view) | 컴포넌트 | 데이터 소스 |
|------|---------|------|
| login | `LoginScreen` | (목업 인증) |
| catalog | `CatalogScreen` + `MeringueHero` | `CLASSES_DATA` |
| detail | `DetailScreen` | `CLASSES_DATA`, `CURRICULUM_DATA`, `REVIEWS_DATA` |
| payment | `PaymentScreen` | 선택 클래스 |
| player | `PlayerScreen` | `CURRICULUM_DATA` |
| myclasses | `MyClassesScreen` | 구매 목록 state |
| dashboard | `DashboardScreen` | `KPI_DASHBOARD_DATA`, `CLASS_MANAGEMENT_DATA` |
| books | `BooksScreen` | 내부 목업 |
| instructor | `InstructorScreen` | 내부 목업 |

---

**변경 이력**
- **v2.0** — 실제 구현(as-built) 기준 전면 동기화: 브랜드(Atelier Crème/민소희), 컬러 토큰 6종·Light 전용, Tailwind 브레이크포인트, 9개 화면(도서·강사 추가), 네이티브 플레이어·목업 결제 반영, 접근성 현황/과제 명시.
- v1.0 — 초기 기획(Next.js/Supabase/Mux 전제, SOWOO 브랜드). §7.3에 갭 보존.
