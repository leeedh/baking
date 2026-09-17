import { type TossFailureKind, tossFailureKind } from './toss-failure';

// Toss 실패 kind → 한국어 안내(서버 detail·운영자 콘솔용).
// 고객 화면은 이 문구를 쓰지 않고 kind로 메시지 카탈로그(errors.toss.*)를 고른다(DC-33·DC-109).
const TOSS_FAILURE_MESSAGES: Record<Exclude<TossFailureKind, 'unknown'>, string> = {
  canceled: '결제가 취소되었습니다.',
  sessionExpired: '결제 유효 시간이 지났습니다. 다시 시도해 주세요.',
  cardRejected: '카드사에서 결제를 거절했습니다. 카드 정보를 확인하거나 다른 카드로 결제해 주세요.',
  limitExceeded: '한도초과 또는 잔액부족으로 결제에 실패했습니다.',
  authFailed: '카드 인증에 실패했습니다. 인증을 다시 진행하거나 다른 카드로 결제해 주세요.',
  network: '결제 진행 중 오류가 발생했습니다. 다시 시도해 주세요.',
  config: '결제 연동 설정에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
};

/** 분류된 코드는 안내 메시지로, 미분류 코드는 Toss 원문(서버가 받은 값)으로 대체한다. */
export function getTossFailureMessage(
  code: string | null | undefined,
  rawMessage: string | null | undefined,
): string {
  const kind = tossFailureKind(code);
  if (kind !== 'unknown') return TOSS_FAILURE_MESSAGES[kind];
  return rawMessage ?? '결제가 취소되었거나 승인되지 않았습니다.';
}
