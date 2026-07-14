import 'server-only';

// TossPayments v2 코어 API 클라이언트 (서버 전용, TS-API-10/11)

const TOSS_API_BASE = 'https://api.tosspayments.com/v1';

function authHeader() {
  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) {
    throw new Error('TOSS_SECRET_KEY가 설정되지 않았습니다 (.env.local 참조).');
  }
  // Basic 인증: "시크릿키:" (콜론 뒤 비밀번호 없음) base64
  return `Basic ${Buffer.from(`${secret}:`).toString('base64')}`;
}

export interface TossPayment {
  paymentKey: string;
  orderId: string;
  status:
    | 'READY'
    | 'IN_PROGRESS'
    | 'WAITING_FOR_DEPOSIT'
    | 'DONE'
    | 'CANCELED'
    | 'PARTIAL_CANCELED'
    | 'ABORTED'
    | 'EXPIRED';
  totalAmount: number;
  method?: string;
  approvedAt?: string;
}

export interface TossError {
  code: string;
  message: string;
}

type TossResult =
  | { ok: true; payment: TossPayment }
  | { ok: false; status: number; error: TossError };

const CONFIRM_MAX_ATTEMPTS = 2;
const CONFIRM_RETRY_DELAY_MS = 300;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 결제 승인 (금액·주문 일치 시에만 호출할 것 — 서버 재검증 후).
 *
 * Idempotency-Key는 orderId를 그대로 사용한다 — orderId는 주문당 고유한 UUID라
 * 재시도(네트워크 오류·5xx)가 같은 키로 전송되어 Toss가 중복 승인하지 않는다.
 * 4xx(확정적 거절)는 재시도하지 않고 즉시 반환한다.
 */
export async function confirmTossPayment(
  paymentKey: string,
  orderId: string,
  amount: number,
): Promise<TossResult> {
  for (let attempt = 1; attempt <= CONFIRM_MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${TOSS_API_BASE}/payments/confirm`, {
        method: 'POST',
        headers: {
          Authorization: authHeader(),
          'Content-Type': 'application/json',
          'Idempotency-Key': orderId,
        },
        body: JSON.stringify({ paymentKey, orderId, amount }),
        cache: 'no-store',
      });
    } catch (e) {
      if (attempt < CONFIRM_MAX_ATTEMPTS) {
        await sleep(CONFIRM_RETRY_DELAY_MS);
        continue;
      }
      throw e;
    }
    const body = await res.json();
    if (!res.ok) {
      if (res.status >= 500 && attempt < CONFIRM_MAX_ATTEMPTS) {
        await sleep(CONFIRM_RETRY_DELAY_MS);
        continue;
      }
      return { ok: false, status: res.status, error: body as TossError };
    }
    return { ok: true, payment: body as TossPayment };
  }
  // 도달 불가 (루프는 반환/throw로만 종료됨).
  throw new Error('confirmTossPayment: unreachable');
}

/** paymentKey로 결제 단건 조회 — webhook 페이로드를 신뢰하지 않고 원본을 재조회(무결성). */
export async function getTossPayment(paymentKey: string): Promise<TossResult> {
  const res = await fetch(`${TOSS_API_BASE}/payments/${encodeURIComponent(paymentKey)}`, {
    headers: { Authorization: authHeader() },
    cache: 'no-store',
  });
  const body = await res.json();
  if (!res.ok) {
    return { ok: false, status: res.status, error: body as TossError };
  }
  return { ok: true, payment: body as TossPayment };
}
