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

/** 결제 승인 (금액·주문 일치 시에만 호출할 것 — 서버 재검증 후). */
export async function confirmTossPayment(
  paymentKey: string,
  orderId: string,
  amount: number,
): Promise<TossResult> {
  const res = await fetch(`${TOSS_API_BASE}/payments/confirm`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentKey, orderId, amount }),
    cache: 'no-store',
  });
  const body = await res.json();
  if (!res.ok) {
    return { ok: false, status: res.status, error: body as TossError };
  }
  return { ok: true, payment: body as TossPayment };
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
