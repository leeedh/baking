import { assertSameOrigin } from '@/lib/api/origin';
import { problem, problemWithCause } from '@/lib/api/problem';
import { requireAdmin } from '@/lib/auth/require-admin';
import { CATALOG_TAG } from '@/lib/cache-tags';
import { getAssetResult, getUploadResult } from '@/lib/mux/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * 영상 정보 복구 — 차시에 남아 있는 Mux 식별자로 재생 ID·재생시간을 다시 가져와 채운다.
 *
 * 왜 필요한가: 인코딩 완료 감지가 **브라우저 폴링뿐**이다(Mux 웹훅 미도입). 폴링이 끊기거나
 * (화면 이탈·새로고침·네트워크) 완료 순간의 저장이 한 번 어긋나면, 파일은 Mux에 멀쩡히
 * 올라가 있는데 차시에는 아무것도 안 남는다. 그러면 재생시간은 비고(--:--) 재생 토큰
 * 라우트는 409로 막아 **수강생이 영상을 못 본다**. 재업로드 말고는 되살릴 방법이 없었다.
 *
 * 이 라우트는 그 안전망이다. 근본 해결(웹훅)은 별도 이슈.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // /api는 미들웨어 밖이라 Route Handler가 스스로 막아야 한다(TS-SEC CSRF).
  const crossOrigin = assertSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  const admin = createAdminClient();
  const { data: lesson, error: readError } = await admin
    .from('lessons')
    .select('id, mux_asset_id, mux_upload_id')
    .eq('id', id)
    .maybeSingle();
  if (readError) {
    return problemWithCause(
      500,
      'lesson-read-failed',
      'Lesson read failed',
      '차시를 불러오지 못했습니다.',
      readError,
    );
  }
  if (!lesson) {
    return problem(404, 'lesson-not-found', 'Lesson not found', '차시를 찾을 수 없습니다.');
  }
  // 자산 ID가 있으면 그쪽이 확실하다. 없으면 업로드 ID로 되짚어 자산을 찾는다
  // (완료 저장이 한 번도 성공하지 못한 차시가 정확히 이 상태다).
  if (!lesson.mux_asset_id && !lesson.mux_upload_id) {
    return problem(
      409,
      'no-mux-reference',
      'No Mux reference',
      '이 차시에는 불러올 영상 기록이 없습니다. 영상을 다시 올려 주세요.',
    );
  }

  let result: Awaited<ReturnType<typeof getAssetResult>>;
  try {
    result = lesson.mux_asset_id
      ? await getAssetResult(lesson.mux_asset_id)
      : // biome-ignore lint/style/noNonNullAssertion: 위에서 둘 중 하나는 있음을 확인했다.
        await getUploadResult(lesson.mux_upload_id!);
  } catch (e) {
    return problem(
      503,
      'mux-unavailable',
      'Mux unavailable',
      e instanceof Error ? e.message : 'Mux 상태를 조회할 수 없습니다.',
    );
  }

  if (result.state === 'preparing' || result.state === 'waiting') {
    return problem(
      409,
      'not-ready',
      'Not ready',
      '아직 인코딩이 끝나지 않았습니다. 잠시 후 다시 시도해 주세요.',
    );
  }
  if (result.state === 'errored' || !result.assetId || !result.playbackId) {
    return problem(
      409,
      'mux-errored',
      'Mux errored',
      result.reason ?? '영상을 사용할 수 없는 상태입니다. 다시 올려 주세요.',
    );
  }

  const { error: updateError } = await admin
    .from('lessons')
    .update({
      mux_asset_id: result.assetId,
      mux_playback_id: result.playbackId,
      mux_upload_id: null,
      // 재생시간을 못 가져왔다면 기존 값을 덮지 않는다(손으로 넣어둔 값이 있을 수 있다).
      ...(result.durationSec !== null ? { duration_sec: result.durationSec } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', lesson.id);
  if (updateError) {
    return problemWithCause(
      500,
      'lesson-update-failed',
      'Lesson update failed',
      '차시 정보를 저장하지 못했습니다.',
      updateError,
    );
  }

  // DC-51 · 재생 가능 여부와 재생시간은 상세 커리큘럼에 그대로 나간다.
  revalidateTag(CATALOG_TAG);

  return NextResponse.json({
    ok: true,
    durationSec: result.durationSec,
    durationMissing: result.durationSec === null,
  });
}
