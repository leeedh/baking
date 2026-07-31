import { assertSameOrigin } from '@/lib/api/origin';
import { problem } from '@/lib/api/problem';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getUploadResult } from '@/lib/mux/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// DC-49 · 업로드→인코딩 진행 상태 조회. 인코딩 완료(ready) 시에만 차시에 자산·재생 ID를 저장한다.
// 실패·대기 중에는 lessons를 건드리지 않아 잘못된 ID가 남지 않는다.
const BodySchema = z.object({
  lessonId: z.guid(),
  uploadId: z.string().trim().min(1).max(200),
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
  const { lessonId, uploadId } = parsed.data;

  let result: Awaited<ReturnType<typeof getUploadResult>>;
  try {
    result = await getUploadResult(uploadId);
  } catch (e) {
    return problem(
      503,
      'mux-unavailable',
      'Mux unavailable',
      e instanceof Error ? e.message : 'Mux 상태를 조회할 수 없습니다.',
    );
  }

  if (result.state === 'ready' && result.assetId && result.playbackId) {
    const admin = createAdminClient();
    const { error } = await admin
      .from('lessons')
      .update({
        mux_asset_id: result.assetId,
        mux_playback_id: result.playbackId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lessonId);
    if (error) {
      return problem(500, 'lesson-update-failed', 'Lesson update failed', error.message);
    }
  }

  return NextResponse.json({ state: result.state });
}
