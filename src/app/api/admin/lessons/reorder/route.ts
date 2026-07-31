import { assertSameOrigin } from '@/lib/api/origin';
import { problem } from '@/lib/api/problem';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// DC-47 · 차시 순서 확정. reorder_lessons RPC가 unique(course_id, order_index) 충돌 없이
// 전체를 1..N으로 원자적 재배치한다(음수 임시 이동 후 재부여).
const BodySchema = z.object({
  courseId: z.guid(),
  orderedIds: z.array(z.guid()).min(1),
});

export async function POST(request: Request) {
  // /api는 미들웨어 밖이라 Route Handler가 스스로 막아야 한다(TS-SEC CSRF).
  const crossOrigin = assertSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'invalid-request', 'Invalid request body', parsed.error.message);
  }
  const { courseId, orderedIds } = parsed.data;

  // reorder_lessons는 내부에서 is_admin()으로 자체 방어한다(auth.uid() 필요). 따라서
  // service_role(admin) 클라이언트가 아니라 운영자 세션 쿠키 클라이언트로 호출해야 한다.
  // 함수는 SECURITY DEFINER라 RLS와 무관하게 순서를 갱신한다. requireAdmin이 앱 계층 가드.
  const supabase = await createClient();
  const { error } = await supabase.rpc('reorder_lessons', {
    p_course_id: courseId,
    p_ids: orderedIds,
  });
  if (error) {
    return problem(500, 'reorder-failed', 'Reorder failed', error.message);
  }

  return NextResponse.json({ ok: true });
}
