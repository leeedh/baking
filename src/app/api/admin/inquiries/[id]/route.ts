import { assertSameOrigin } from '@/lib/api/origin';
import { problem } from '@/lib/api/problem';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// TS-API-15 · DC-97 (PRD-F-21) · 운영자 답변 등록 · 상태 전이(open → answered → closed).
// 이중 방어: assertSameOrigin(CSRF) → requireAdmin(role). service_role은 RLS를 우회하므로
// 앱 계층 role 확인이 필수이고, RLS(inquiries_update_admin)는 backstop이다.
// answered_by/answered_at은 클라이언트 값을 받지 않고 서버 세션·시각으로 채운다.

const BodySchema = z
  .object({
    answerBody: z.string().trim().min(1).max(4000).optional(),
    status: z.enum(['open', 'answered', 'closed']).optional(),
  })
  .refine((v) => v.answerBody !== undefined || v.status !== undefined, {
    message: '변경할 내용이 없습니다.',
  });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const crossOrigin = assertSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!z.guid().safeParse(id).success) {
    return problem(400, 'invalid-request', 'Invalid inquiry id', '잘못된 문의 ID입니다.');
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'invalid-request', 'Invalid body', '답변 내용을 확인해주세요.');
  }
  const { answerBody, status } = parsed.data;

  // requireAdmin을 통과했으므로 세션은 존재한다(답변자 기록용).
  const admin = await getUser();

  const patch: {
    answer_body?: string;
    answered_by?: string | null;
    answered_at?: string;
    status?: 'open' | 'answered' | 'closed';
  } = {};
  if (answerBody !== undefined) {
    patch.answer_body = answerBody;
    patch.answered_by = admin?.id ?? null;
    patch.answered_at = new Date().toISOString();
    // 답변을 달면 기본 전이는 answered — 호출자가 status를 명시하면 그 값이 이긴다.
    patch.status = 'answered';
  }
  if (status !== undefined) patch.status = status;

  const db = createAdminClient();
  const { data, error } = await db
    .from('inquiries')
    .update(patch)
    .eq('id', id)
    .select('id, status, answer_body, answered_at')
    .maybeSingle();

  if (error) {
    return problem(500, 'inquiry-update-failed', 'Inquiry update failed', error.message);
  }
  if (!data) {
    return problem(404, 'inquiry-not-found', 'Inquiry not found', '문의를 찾을 수 없습니다.');
  }

  return NextResponse.json(data);
}
