import { createServerClient } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { getSupabasePublicEnv } from './lib/supabase/env';

const handleI18nRouting = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // 1) next-intl이 로케일 라우팅/리다이렉트를 처리한 응답을 만든다.
  const response = handleI18nRouting(request);

  const env = getSupabasePublicEnv();

  // Vercel에 env가 없으면 createServerClient가 throw → MIDDLEWARE_INVOCATION_FAILED(500).
  // 공개 페이지는 i18n만으로라도 살아 있게 두고, Auth는 env 설정 후 동작한다.
  if (!env) {
    console.error(
      '[middleware] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 미설정',
    );
    return response;
  }

  // 2) 같은 응답에 Supabase 세션 쿠키를 갱신한다(토큰 자동 리프레시).
  try {
    const supabase = createServerClient(env.url, env.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            // request에도 반영해 같은 요청의 하위 서버 컴포넌트(가드)가 갱신 토큰을 읽게 한다.
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    // getUser()가 만료 임박 토큰을 갱신하고 위 setAll로 쿠키를 응답에 기록한다.
    await supabase.auth.getUser();
  } catch {
    // 클라이언트 생성·세션 갱신 실패는 무시 — 보호 페이지는 서버 가드가 재검증한다.
  }

  return response;
}

export const config = {
  // api / auth(OAuth 콜백) / 정적 자산은 미들웨어에서 제외.
  matcher: ['/((?!api|auth|trpc|_next|_vercel|.*\\..*).*)'],
};
