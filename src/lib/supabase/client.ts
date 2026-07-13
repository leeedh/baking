import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../../../supabase/database.types';
import { getSupabasePublicEnv } from './env';

/** 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트. 쿠키 기반 세션 저장. */
export function createClient() {
  const env = getSupabasePublicEnv();
  if (!env) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다. Vercel Project Settings > Environment Variables를 확인하세요.',
    );
  }
  return createBrowserClient<Database>(env.url, env.anonKey);
}
