import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '../../../supabase/database.types';

/** 서버 컴포넌트/라우트 핸들러용 Supabase 클라이언트. 요청 쿠키에서 세션을 읽는다. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component에서 호출 시 set이 막힘 — 미들웨어가 세션 갱신을 담당하므로 무시 가능.
          }
        },
      },
    },
  );
}

/** 현재 인증 사용자(검증됨). 세션 없으면 null. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** 현재 사용자 프로필(role 포함). 세션 없으면 null. */
export async function getProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, role, locale')
    .eq('id', user.id)
    .single();
  return data;
}
