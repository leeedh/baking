import { problem } from '@/lib/api/problem';

/**
 * 상태 변경 라우트의 CSRF 방어 — Origin이 자기 호스트와 일치하는지 확인한다.
 *
 * 미들웨어 matcher가 `/api`를 제외하고 Route Handler에는 Next의 CSRF 보호가 없다.
 * JSON 라우트는 프리플라이트가 사실상 2차 방어가 되지만 `multipart/form-data`는
 * CORS-simple이라 프리플라이트가 없어, 쿠키의 SameSite=lax 하나에만 기대게 된다.
 * 방어를 한 겹 더 둔다.
 *
 * Origin 헤더가 없으면 통과시킨다: 브라우저는 상태 변경 요청에 Origin을 항상 붙이므로
 * 공격자가 이를 제거할 수 없고, 헤더가 없는 쪽은 서버 간 호출·CLI다.
 *
 * 사용: `const denied = assertSameOrigin(request); if (denied) return denied;`
 */
export function assertSameOrigin(request: Request): Response | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;

  // 프록시(Vercel) 뒤에서는 request.url의 호스트가 내부 주소일 수 있어 헤더를 우선한다.
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return problem(403, 'cross-origin', 'Cross-origin request', '잘못된 요청 출처입니다.');
  }

  if (!host || originHost !== host) {
    return problem(403, 'cross-origin', 'Cross-origin request', '허용되지 않은 요청 출처입니다.');
  }
  return null;
}
