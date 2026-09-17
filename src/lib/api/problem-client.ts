import { type TossFailureKind, tossFailureKind } from '@/lib/payments/toss-failure';
import { PROBLEM_TYPE_BASE } from './problem-type-base';

// DC-109 · 서버 Problem Details → 고객 화면 메시지 키.
//
// 라우트는 로케일을 모른다(미들웨어 matcher가 /api를 제외). 그래서 서버는 안정적인 `type`만
// 약속하고, 화면이 그 슬러그로 `errors.*` 메시지를 고른다. `detail`(한국어)은 로그·운영자용으로 남는다.
// 매핑에 없는 type은 null → 호출부가 화면 맥락에 맞는 일반 안내로 폴백한다.

/** 고객 화면에서 도달 가능한 type만 둔다. 운영자 전용(업로드·차시 수정 등)은 한국어 detail을 그대로 쓴다. */
const TYPE_TO_KEY = {
  unauthorized: 'unauthorized',
  forbidden: 'forbidden',
  'cross-origin': 'forbidden',
  'invalid-request': 'invalidRequest',
  'no-access': 'noAccess',
  'progress-denied': 'noAccess',
  'not-enrolled': 'notEnrolled',
  'course-not-found': 'courseNotFound',
  'order-not-found': 'orderNotFound',
  'lesson-not-found': 'lessonNotFound',
  'material-not-found': 'materialNotFound',
  'review-not-found': 'reviewNotFound',
  'review-exists': 'reviewExists',
  'invalid-coupon': 'invalidCoupon',
  'already-enrolled': 'alreadyEnrolled',
  'already-paid': 'alreadyPaid',
  'confirm-in-progress': 'paymentInProgress',
  'order-in-progress': 'paymentInProgress',
  'order-invalid-state': 'orderInvalidState',
  'amount-mismatch': 'amountMismatch',
  'grant-failed': 'grantDelayed',
  'no-video': 'videoNotReady',
  'mux-unconfigured': 'videoUnavailable',
  'mux-unavailable': 'videoUnavailable',
} as const;

export type ProblemMessageKey = (typeof TYPE_TO_KEY)[keyof typeof TYPE_TO_KEY];
export const PROBLEM_MESSAGE_KEYS = [...new Set(Object.values(TYPE_TO_KEY))] as ProblemMessageKey[];

export type ParsedProblem = {
  /** `type` URI의 슬러그(`amount-mismatch`). Problem 형식이 아니면 null. */
  slug: string | null;
  /** Toss 승인 실패일 때만 채워진다. */
  tossKind: TossFailureKind | null;
};

/** 응답 본문(JSON 파싱 결과, 실패 시 null)을 Problem으로 해석한다. 어떤 입력에도 던지지 않는다. */
export function parseProblem(body: unknown): ParsedProblem {
  if (!body || typeof body !== 'object') return { slug: null, tossKind: null };
  const { type, code } = body as { type?: unknown; code?: unknown };
  const slug =
    typeof type === 'string' && type.startsWith(PROBLEM_TYPE_BASE)
      ? type.slice(PROBLEM_TYPE_BASE.length) || null
      : null;
  const tossKind =
    slug === 'toss-confirm-failed' ? tossFailureKind(typeof code === 'string' ? code : null) : null;
  return { slug, tossKind };
}

/**
 * 화면이 쓸 메시지 키를 고른다.
 * - Toss 승인 실패 → `toss.<kind>`
 * - 매핑된 type → `<key>`
 * - 그 외 → null (호출부 폴백)
 */
export function problemMessageKey(parsed: ParsedProblem): string | null {
  if (parsed.tossKind) return `toss.${parsed.tossKind}`;
  if (!parsed.slug) return null;
  return (TYPE_TO_KEY as Record<string, string>)[parsed.slug] ?? null;
}
