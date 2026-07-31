import { describe, expect, it } from 'vitest';
import { assertSameOrigin } from './origin';

function request(headers: Record<string, string>, url = 'https://ateliercreme.com/api/x') {
  return new Request(url, { method: 'POST', headers });
}

describe('assertSameOrigin', () => {
  it('Origin 헤더가 없으면 통과 — 서버 간 호출·CLI 경로', () => {
    expect(assertSameOrigin(request({ host: 'ateliercreme.com' }))).toBeNull();
  });

  it('같은 출처면 통과', () => {
    expect(
      assertSameOrigin(
        request({
          origin: 'https://ateliercreme.com',
          'x-forwarded-host': 'ateliercreme.com',
          'x-forwarded-proto': 'https',
        }),
      ),
    ).toBeNull();
  });

  it('host가 다르면 403', () => {
    const denied = assertSameOrigin(
      request({
        origin: 'https://evil.example',
        'x-forwarded-host': 'ateliercreme.com',
        'x-forwarded-proto': 'https',
      }),
    );
    expect(denied?.status).toBe(403);
  });

  it('host는 같아도 scheme이 다르면 403', () => {
    const denied = assertSameOrigin(
      request({
        origin: 'http://ateliercreme.com',
        'x-forwarded-host': 'ateliercreme.com',
        'x-forwarded-proto': 'https',
      }),
    );
    expect(denied?.status).toBe(403);
  });

  it('x-forwarded-proto가 없으면 request.url의 스킴을 쓴다(로컬 http 개발)', () => {
    expect(
      assertSameOrigin(
        request({ origin: 'http://localhost:3000', host: 'localhost:3000' }, 'http://localhost:3000/api/x'),
      ),
    ).toBeNull();
  });

  it('Origin이 URL로 파싱되지 않으면 403', () => {
    const denied = assertSameOrigin(request({ origin: 'not-a-url', host: 'ateliercreme.com' }));
    expect(denied?.status).toBe(403);
  });

  it('host 헤더가 아예 없으면 403 — 비교 기준이 없으므로 fail closed', () => {
    const denied = assertSameOrigin(
      new Request('https://ateliercreme.com/api/x', {
        method: 'POST',
        headers: { origin: 'https://ateliercreme.com' },
      }),
    );
    // Request 생성 시 host 헤더는 자동으로 붙지 않는다.
    expect(denied?.status).toBe(403);
  });
});
