import type { Locale } from '@/i18n/routing';

/** 바이트 → 사람이 읽는 크기(자료 목록 표기용). 값이 없으면 빈 문자열. */
export function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

// -----------------------------------------------------------------------------
// 로케일 표기 (코드리뷰 DC-65)
//
// 예전에는 화면마다 `₩{n.toLocaleString()}` / `toLocaleDateString('ko-KR')`가 흩어져 있었다.
// 문제가 둘이다.
//   1) toLocaleString()을 인자 없이 부르면 **런타임 기본 로케일**을 따른다. 서버(Node)와
//      브라우저의 기본값이 다르면 자릿수 구분이 달라져 하이드레이션 불일치가 난다.
//   2) 'ko-KR'을 하드코딩한 날짜는 /en 사용자에게도 한국식으로 나온다.
// 그래서 **로케일을 항상 명시**하는 헬퍼로 모은다.
//
// 통화는 TS-ADR-05대로 KRW 단일이다 — 여기서 바꾸는 것은 **표기 로케일이지 통화가 아니다**.
// (ko/en 모두 기호는 ₩로 같고, 자릿수 구분만 로케일 규칙을 따른다.)
// -----------------------------------------------------------------------------

/** 금액(원) → 통화 표기. 예: 129000 → "₩129,000" */
export function formatKrw(amount: number | null | undefined, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

/** 일반 정수 → 자릿수 구분 표기. 수강생 수·판매 건수 등. */
export function formatCount(value: number | null | undefined, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(value ?? 0);
}

/** ISO 문자열 → 날짜 표기. ko: "2026. 8. 5." / en: "Aug 5, 2026" */
export function formatDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(d);
}

/** ISO 문자열 → 날짜+시각 표기(운영 목록의 정렬 근거를 보여줄 때). */
export function formatDateTime(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}
