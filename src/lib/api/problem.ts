import { NextResponse } from 'next/server';

/** RFC 7807 Problem Details 응답 (TS §4.4). */
export function problem(status: number, type: string, title: string, detail?: string) {
  return NextResponse.json(
    { type: `https://ateliercreme.example/errors/${type}`, title, status, detail },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

/**
 * 내부 원인을 서버 로그에만 남기고 사용자에겐 고정 문구를 돌려주는 Problem 응답
 * (코드리뷰 L-2).
 *
 * 예전에는 `problem(500, ..., error.message)` 형태로 DB 제약명·PostgREST 원문·Zod 스키마
 * 내부가 그대로 응답에 실렸다. 스키마 구조를 노출하고 운영자에게도 쓸모가 없는 문자열이라,
 * 진단 정보는 `console.error`로만 보내고 `detail`은 사용자용 한국어로 고정한다.
 *
 * 공급자 코드를 **의도적으로** 사용자 문구로 매핑하는 곳(payments/confirm의
 * getTossFailureMessage, reviews의 reviewError)은 이 헬퍼를 쓰지 않는다 — 그건 노출이 아니라 번역이다.
 */
export function problemWithCause(
  status: number,
  type: string,
  title: string,
  userDetail: string,
  cause: unknown,
) {
  const reason =
    cause instanceof Error
      ? cause.message
      : typeof cause === 'string'
        ? cause
        : JSON.stringify(cause);
  console.error(`[${type}] ${reason}`);
  return problem(status, type, title, userDetail);
}
