import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../../../supabase/database.types';

/** 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트. 쿠키 기반 세션 저장. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );
}
