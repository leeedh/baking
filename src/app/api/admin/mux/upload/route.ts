import { assertSameOrigin } from '@/lib/api/origin';
import { problem, problemWithCause } from '@/lib/api/problem';
import { requireAdmin } from '@/lib/auth/require-admin';
import { CATALOG_TAG } from '@/lib/cache-tags';
import { createDirectUpload } from '@/lib/mux/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// DC-48 · 운영자 브라우저 직접 업로드용 Mux Direct Upload URL 발급.
const BodySchema = z.object({ lessonId: z.guid() });

export async function POST(request: Request) {
  // /api는 미들웨어 밖이라 Route Handler가 스스로 막아야 한다(TS-SEC CSRF).
  const crossOrigin = assertSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'invalid-request', 'Invalid request body', '요청 형식이 올바르지 않습니다.');
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
    // 진행 중인 업로드를 차시에 남긴다 — 운영자가 인코딩 도중 화면을 떠나도 편집기가
    // 재진입 시 폴링을 이어갈 수 있다(완료 시 status 라우트가 null로 지운다).
    // 기록에 실패하면 재진입 폴링이 죽어 인코딩 결과를 영영 못 받는다 — 조용히 넘기지 않는다.
    const { error: markError } = await admin
      .from('lessons')
      .update({ mux_upload_id: uploadId, updated_at: new Date().toISOString() })
      .eq('id', lesson.id);
    if (markError) {
      return problemWithCause(
        500,
        'lesson-update-failed',
        'Lesson update failed',
        '업로드 상태를 차시에 기록하지 못했습니다.',
        markError,
      );
    }
    // DC-51 · mux_upload_id 자체는 카탈로그에 안 나가지만, lessons에 쓰는 라우트는 예외 없이
    // 무효화한다(cache-tags.test의 규약). 운영자 업로드 시작은 드물어 비용도 무시할 만하다.
    revalidateTag(CATALOG_TAG);
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
