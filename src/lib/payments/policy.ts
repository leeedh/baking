import type { TossPayment } from './toss';

// 결제 경로의 순수 판정 로직 — DB·네트워크에 의존하지 않아 단위 테스트가 가능하다.
// (라우트 안에 인라인으로 두면 이 판정들을 자동 검증할 방법이 없다 — 코드리뷰 X-5)

/**
 * Toss confirm 실패 응답을 받았을 때 주문을 'failed'로 마킹해도 되는가?
 *
 * 확정적 거절(4xx)만 true. 5xx·타임아웃은 Toss가 **실제로는 승인**했을 수 있으므로
 * pending을 유지해 webhook(DONE)이 완결·복구할 경로를 열어 둔다
 * (승인됐는데 수강권이 없는 상태를 막는다).
 */
export function shouldMarkOrderFailed(status: number): boolean {
  return status >= 400 && status < 500;
}

/**
 * PG 기준 누적 취소금액. Toss는 부분 취소를 반복하면 cancels 배열에 항목을 쌓으므로
 * 마지막 항목이 아니라 합계가 "지금까지 취소된 총액"이다(코드리뷰 H-3).
 * 취소 내역이 없으면 null → 호출부/RPC가 전액 취소로 간주한다.
 */
export function totalCanceledAmount(payment: TossPayment): number | null {
  const cancels = payment.cancels;
  if (!cancels || cancels.length === 0) return null;
  return cancels.reduce((sum, c) => sum + (c.cancelAmount ?? 0), 0);
}
