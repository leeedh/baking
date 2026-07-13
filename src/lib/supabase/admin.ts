import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../supabase/database.types';

/**
 * service_role 관리자 클라이언트 — RLS를 우회한다.
 * 결제 확정(주문 생성·grant_enrollment) 등 서버 전용 쓰기에만 사용.
 * 'server-only' 가드로 클라이언트 번들 유입을 빌드 타임에 차단.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다 (.env.local 참조).');
  }
  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL as string, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
