import { problem } from '@/lib/api/problem';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createDirectUpload } from '@/lib/mux/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// DC-48 · 운영자 브라우저 직접 업로드용 Mux Direct Upload URL 발급.
const BodySchema = z.object({ lessonId: z.guid() });

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'invalid-request', 'Invalid request body', parsed.error.message);
  }

  const admin = createAdminClient();
  const { data: lesson } = await admin
    .from('lessons')
    .select('id')
    .eq('id', parsed.data.lessonId)
    .maybeSingle();
  if (!lesson) {
    return problem(404, 'lesson-not-found', 'Lesson not found', '차시를 찾을 수 없습니다.');
  }

  const origin = request.headers.get('origin') ?? new URL(request.url).origin;

  try {
    const { uploadId, uploadUrl } = await createDirectUpload(origin);
    return NextResponse.json({ uploadId, uploadUrl });
  } catch (e) {
    // Mux env 미설정 등 → 503.
    return problem(
      503,
      'mux-unavailable',
      'Mux unavailable',
      e instanceof Error ? e.message : 'Mux 업로드를 생성할 수 없습니다.',
    );
  }
}
