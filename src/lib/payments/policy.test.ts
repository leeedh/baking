import { describe, expect, it } from 'vitest';
import { shouldMarkOrderFailed, totalCanceledAmount } from './policy';
import type { TossPayment } from './toss';

describe('shouldMarkOrderFailed', () => {
  it('확정적 거절(4xx)만 주문을 failed로 마킹한다', () => {
    expect(shouldMarkOrderFailed(400)).toBe(true);
    expect(shouldMarkOrderFailed(403)).toBe(true);
    expect(shouldMarkOrderFailed(499)).toBe(true);
  });

  it('5xx·타임아웃은 pending을 유지한다 — Toss가 실제로 승인했을 수 있다', () => {
    expect(shouldMarkOrderFailed(500)).toBe(false);
    expect(shouldMarkOrderFailed(502)).toBe(false);
    expect(shouldMarkOrderFailed(504)).toBe(false);
    // 네트워크 실패를 0으로 표현하는 경로도 pending 유지여야 한다.
    expect(shouldMarkOrderFailed(0)).toBe(false);
  });
});

function payment(cancels: TossPayment['cancels']): TossPayment {
  return {
    paymentKey: 'pk_test',
    orderId: '11111111-1111-1111-1111-111111111111',
    status: 'PARTIAL_CANCELED',
    totalAmount: 100000,
    cancels,
  } as TossPayment;
}

describe('totalCanceledAmount', () => {
  it('취소 내역이 없으면 null — 호출부가 전액 취소로 간주한다', () => {
    expect(totalCanceledAmount(payment(null))).toBeNull();
    expect(totalCanceledAmount(payment([]))).toBeNull();
    expect(totalCanceledAmount(payment(undefined))).toBeNull();
  });

  it('부분 취소가 반복되면 마지막 건이 아니라 누적 합계를 돌려준다', () => {
    expect(totalCanceledAmount(payment([{ cancelAmount: 5000 }]))).toBe(5000);
    expect(
      totalCanceledAmount(payment([{ cancelAmount: 5000 }, { cancelAmount: 3000 }])),
    ).toBe(8000);
    // 합계가 주문 금액과 같아지는 순간이 전액 취소 — refund_order가 이 값으로 판정한다.
    expect(
      totalCanceledAmount(payment([{ cancelAmount: 40000 }, { cancelAmount: 60000 }])),
    ).toBe(100000);
  });

  it('금액이 빠진 항목은 0으로 센다', () => {
    expect(totalCanceledAmount(payment([{ transactionKey: 'tk' }, { cancelAmount: 1000 }]))).toBe(
      1000,
    );
  });
});
