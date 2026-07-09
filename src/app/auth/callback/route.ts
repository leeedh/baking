import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * OAuth / 이메일 매직링크 콜백. provider가 code를 붙여 리다이렉트하면
 * 세션으로 교환하고 홈(또는 next)으로 보낸다. next-intl 미들웨어 matcher에서 /auth 제외됨.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 실패 시 로그인 페이지로(기본 로케일)
  return NextResponse.redirect(`${origin}/ko/login?error=oauth`);
}
