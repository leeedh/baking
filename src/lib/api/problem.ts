import { NextResponse } from 'next/server';

/** RFC 7807 Problem Details 응답 (TS §4.4). */
export function problem(status: number, type: string, title: string, detail?: string) {
  return NextResponse.json(
    { type: `https://ateliercreme.example/errors/${type}`, title, status, detail },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}
