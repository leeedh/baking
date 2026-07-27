import 'server-only';

import { z } from 'zod';

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

// 외부 응답도 자체 API와 같은 기준으로 검증한다(단언 금지). 스키마에 없는 status가 오면
// 파싱을 실패시켜 502로 반환 — 호출부의 분기를 조용히 빠져나가 주문이 pending에
// 영구 정체되는 것을 막는다(webhook은 502를 받으면 Toss가 재전송한다).
const TossPaymentSchema = z.object({
  paymentKey: z.string(),
  orderId: z.string(),
  status: z.enum([
    'READY',
    'IN_PROGRESS',
    'WAITING_FOR_DEPOSIT',
    'DONE',
    'CANCELED',
    'PARTIAL_CANCELED',
    'ABORTED',
    'EXPIRED',
  ]),
  totalAmount: z.number().int(),
  method: z.string().optional(),
  approvedAt: z.string().optional(),
});

export type TossPayment = z.infer<typeof TossPaymentSchema>;

export interface TossError {
  code: string;
  message: string;
}

/** 게이트웨이 장애로 JSON이 아닌 본문(HTML 오류 페이지 등)이 와도 예외를 던지지 않는다. */
async function readJson(res: Response): Promise<unknown> {
  return res.json().catch(() => ({
    code: 'INVALID_RESPONSE',
    message: `Toss 응답을 해석할 수 없습니다 (HTTP ${res.status}).`,
  }));
}

/** 검증된 결제 객체로 변환. 스키마 불일치는 502 결과로 돌려준다. */
function parsePayment(body: unknown): TossResult {
  const parsed = TossPaymentSchema.safeParse(body);
  if (!parsed.success) {
    console.error(`[toss-invalid-response] ${parsed.error.message}`);
    return {
      ok: false,
      status: 502,
      error: {
        code: 'INVALID_RESPONSE',
        message: 'Toss 응답 형식이 예상과 다릅니다.',
      },
    };
  }
  return { ok: true, payment: parsed.data };
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
    const body = await readJson(res);
    if (!res.ok) {
      if (res.status >= 500 && attempt < CONFIRM_MAX_ATTEMPTS) {
        await sleep(CONFIRM_RETRY_DELAY_MS);
        continue;
      }
      return { ok: false, status: res.status, error: body as TossError };
    }
    return parsePayment(body);
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
  const body = await readJson(res);
  if (!res.ok) {
    return { ok: false, status: res.status, error: body as TossError };
  }
  return parsePayment(body);
}
