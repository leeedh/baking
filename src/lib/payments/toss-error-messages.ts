// Toss v2 결제 실패 code → 한국어 안내 메시지 (공식 에러 코드 문서 기준).
const TOSS_FAILURE_MESSAGES: Record<string, string> = {
  PAY_PROCESS_CANCELED: '결제가 취소되었습니다.',
  PAY_PROCESS_ABORTED: '결제 진행 중 오류가 발생했습니다. 다시 시도해 주세요.',
  REJECT_CARD_COMPANY: '카드사에서 결제를 거절했습니다. 비밀번호·한도·잔액을 확인해 주세요.',
  REJECT_CARD_PAYMENT: '한도초과 또는 잔액부족으로 결제에 실패했습니다.',
  NOT_FOUND_PAYMENT_SESSION: '결제 유효 시간이 지났습니다. 다시 시도해 주세요.',
  FORBIDDEN_REQUEST: '결제 요청 정보가 올바르지 않습니다.',
  UNAUTHORIZED_KEY: '결제 연동 설정에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
};

/** 매핑된 코드는 안내 메시지로, 미매핑 코드는 Toss가 보낸 원문 메시지로 대체한다. */
export function getTossFailureMessage(
  code: string | null | undefined,
  rawMessage: string | null | undefined,
): string {
  if (code && TOSS_FAILURE_MESSAGES[code]) {
    return TOSS_FAILURE_MESSAGES[code];
  }
  return rawMessage ?? '결제가 취소되었거나 승인되지 않았습니다.';
}
