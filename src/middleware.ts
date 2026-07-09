import { createServerClient } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const handleI18nRouting = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // 1) next-intl이 로케일 라우팅/리다이렉트를 처리한 응답을 만든다.
  const response = handleI18nRouting(request);

  // 2) 같은 응답에 Supabase 세션 쿠키를 갱신한다(토큰 자동 리프레시).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
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
    },
  );

  // getUser()가 만료 임박 토큰을 갱신하고 위 setAll로 쿠키를 응답에 기록한다.
  // Auth 일시 장애가 공개 카탈로그까지 500으로 막지 않도록 방어.
  try {
    await supabase.auth.getUser();
  } catch {
    // 세션 갱신 실패는 무시 — 보호 페이지는 각자의 서버 가드가 재검증한다.
  }

  return response;
}

export const config = {
  // api / auth(OAuth 콜백) / 정적 자산은 미들웨어에서 제외.
  matcher: ['/((?!api|auth|trpc|_next|_vercel|.*\\..*).*)'],
};
