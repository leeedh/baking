import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../supabase/database.types';
import { getSupabasePublicEnv } from './env';

/**
 * 공개 데이터 전용 Supabase 클라이언트 — **세션 없음 · anon 키 · RLS 그대로 적용**.
 *
 * `server.ts`의 `createClient()`와 권한은 동일(anon)하지만 **쿠키를 읽지 않는다**는 점만 다르다.
 * 쿠키 접근은 그 자체로 렌더를 동적으로 만들고 `unstable_cache` 안에서는 호출조차 불가하므로,
 * 세션과 무관한 카탈로그 조회(`lib/catalog.ts`)는 이 클라이언트를 써야 캐시에 얹을 수 있다.
 *
 * ⚠️ 사용자별 데이터에는 절대 쓰지 말 것 — 세션이 없어 `auth.uid()`가 null이고,
 * owner 기반 RLS 정책(enrollments·progress·inquiries)은 아무 행도 돌려주지 않는다.
 * service_role이 아니므로 신뢰 경계는 넓어지지 않는다(admin.ts와의 차이).
 */
export function createPublicClient() {
  const env = getSupabasePublicEnv();
  if (!env) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다. Vercel Environment Variables를 확인하세요.',
    );
  }
  return createSupabaseClient<Database>(env.url, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
