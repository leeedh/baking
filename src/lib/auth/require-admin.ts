import 'server-only';

import { problem } from '@/lib/api/problem';
import { getProfile } from '@/lib/supabase/server';

/**
 * 운영자 전용 API 라우트 가드. 성공 시 null, 실패 시 RFC 7807 응답을 반환한다.
 * DB의 is_admin() RLS가 이중 백스톱이지만, service_role(createAdminClient)은 RLS를
 * 우회하므로 앱 계층에서 반드시 role을 확인해야 한다.
 *
 * 사용: `const denied = await requireAdmin(); if (denied) return denied;`
 */
export async function requireAdmin(): Promise<Response | null> {
  const profile = await getProfile();
  if (!profile) {
    return problem(401, 'unauthorized', 'Login required', '로그인이 필요합니다.');
  }
  if (profile.role !== 'admin') {
    return problem(403, 'forbidden', 'Admin only', '운영자만 접근할 수 있습니다.');
  }
  return null;
}
