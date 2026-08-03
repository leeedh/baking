import { assertSameOrigin } from '@/lib/api/origin';
import { problem } from '@/lib/api/problem';
import { createClient, getUser } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// TS-API-14 · DC-97 (PRD-F-21) · 1:1 비공개 문의 생성.
//
// 미들웨어 matcher가 /api를 제외하므로 이 라우트가 스스로 가드한다:
//   · assertSameOrigin — CSRF (Next 라우트 핸들러엔 기본 방어가 없다)
//   · getUser         — 로그인 회원만 작성(비로그인은 401 → 화면에서 로그인 유도)
//   · user_id는 서버 세션에서 주입 — 클라이언트가 보낸 소유자 값은 신뢰하지 않는다
// RLS(inquiries_insert_own)는 backstop이다.
const CATEGORIES = ['결제', '수강', '영상', '자료', '기타'] as const;

const CreateSchema = z.object({
  category: z.enum(CATEGORIES).default('기타'),
  subject: z.string().trim().min(2).max(120),
  body: z.string().trim().min(5).max(4000),
});

export async function POST(request: Request) {
  const denied = assertSameOrigin(request);
  if (denied) return denied;

  const user = await getUser();
  if (!user) {
    return problem(401, 'unauthorized', 'Login required', '로그인이 필요합니다.');
  }

  const parsed = CreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'invalid-request', 'Invalid request body', '문의 내용을 확인해주세요.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('inquiries')
    .insert({
      user_id: user.id,
      category: parsed.data.category,
      subject: parsed.data.subject,
      body: parsed.data.body,
    })
    .select('id, category, subject, body, status, created_at')
    .single();

  if (error || !data) {
    if (error?.code === '42501') {
      return problem(403, 'forbidden', 'Not allowed', '문의를 등록할 권한이 없습니다.');
    }
    return problem(
      500,
      'inquiry-failed',
      'Inquiry request failed',
      '문의를 저장하지 못했습니다.',
    );
  }

  return NextResponse.json(data, { status: 201 });
}
