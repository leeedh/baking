// DC-33 · Toss 실패 코드를 "고객이 다음에 할 행동"이 같은 묶음(kind)으로 분류한다.
//
// 코드 자체는 수십 종이지만 고객에게 필요한 건 원인의 정밀도가 아니라 다음 행동이다
// (다시 시도 / 다른 카드 / 인증 다시 / 문의). 화면은 kind로 문구·CTA를 고르고,
// 서버는 같은 kind로 한국어 detail을 만든다 — 분류 기준이 한 곳에만 있도록.

export const TOSS_FAILURE_KINDS = [
  'canceled',
  'sessionExpired',
  'cardRejected',
  'limitExceeded',
  'authFailed',
  'network',
  'config',
  'unknown',
] as const;

export type TossFailureKind = (typeof TOSS_FAILURE_KINDS)[number];

// Toss v2 공식 에러 코드 문서 기준. 목록에 없는 코드는 아래 패턴 규칙 → unknown 순으로 폴백한다.
const CODE_TO_KIND: Record<string, TossFailureKind> = {
  PAY_PROCESS_CANCELED: 'canceled',
  USER_CANCEL: 'canceled',
  NOT_FOUND_PAYMENT_SESSION: 'sessionExpired',
  REJECT_CARD_COMPANY: 'cardRejected',
  INVALID_REJECT_CARD: 'cardRejected',
  INVALID_STOPPED_CARD: 'cardRejected',
  INVALID_CARD_NUMBER: 'cardRejected',
  INVALID_CARD_EXPIRATION: 'cardRejected',
  INVALID_CARD_LOST_OR_STOLEN: 'cardRejected',
  INVALID_CARD_INSTALLMENT_PLAN: 'cardRejected',
  NOT_SUPPORTED_CARD_TYPE: 'cardRejected',
  FDS_ERROR: 'cardRejected',
  REJECT_CARD_PAYMENT: 'limitExceeded',
  EXCEED_MAX_DAILY_PAYMENT_COUNT: 'limitExceeded',
  EXCEED_MAX_PAYMENT_AMOUNT: 'limitExceeded',
  EXCEED_MAX_CARD_INSTALLMENT_PLAN: 'limitExceeded',
  INVALID_PASSWORD: 'authFailed',
  EXCEED_MAX_AUTH_COUNT: 'authFailed',
  INVALID_AUTHORIZE_AUTH: 'authFailed',
  PAY_PROCESS_ABORTED: 'network',
  FAILED_INTERNAL_SYSTEM_PROCESSING: 'network',
  FAILED_PAYMENT_INTERNAL_SYSTEM_PROCESSING: 'network',
  FAILED_CARD_COMPANY_RESPONSE: 'network',
  PROVIDER_ERROR: 'network',
  UNAUTHORIZED_KEY: 'config',
  INVALID_API_KEY: 'config',
  FORBIDDEN_REQUEST: 'config',
};

export function tossFailureKind(code: string | null | undefined): TossFailureKind {
  if (!code) return 'unknown';
  const mapped = CODE_TO_KIND[code];
  if (mapped) return mapped;
  // 해외카드 3DS 등 인증 계열은 코드가 계속 늘어난다 — 이름 규칙으로 흡수한다.
  if (/(_AUTH\b|_AUTH_|3DS|PASSWORD)/.test(code)) return 'authFailed';
  return 'unknown';
}

/** kind별로 고객이 누를 주 CTA. 'retry'=같은 결제 다시, 'otherMethod'=다른 카드·수단 안내. */
export function tossFailureAction(kind: TossFailureKind): 'retry' | 'otherMethod' | 'contact' {
  switch (kind) {
    case 'cardRejected':
    case 'limitExceeded':
    case 'authFailed':
      return 'otherMethod';
    case 'config':
      return 'contact';
    default:
      return 'retry';
  }
}
