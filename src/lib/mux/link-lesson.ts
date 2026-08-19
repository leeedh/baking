import 'server-only';

import { CATALOG_TAG } from '@/lib/cache-tags';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PostgrestError } from '@supabase/supabase-js';
import { revalidateTag } from 'next/cache';

/**
 * DC-111 · 인코딩이 끝난 Mux 자산을 차시에 기록하는 **유일한 쓰기 지점.**
 *
 * 이 업데이트는 원래 세 경로에 각각 복제돼 있었다 — 브라우저 폴링(upload/status),
 * 수동 복구(refresh-video), 그리고 새로 붙는 웹훅. 같은 다섯 필드를 세 곳에서 따로
 * 관리하면 한 곳만 고치는 사고가 나기 딱 좋다(실제로 이 저장이 어긋나 차시가 빈 채로
 * 남은 것이 DC-110이었다). 한 군데로 모은다.
 *
 * 멱등하다 — 같은 통보가 두 번 도착해도 같은 값을 다시 쓸 뿐이다. 그래서 웹훅 재시도나
 * 폴링과 웹훅이 겹쳐 도착하는 경쟁 상황을 따로 막을 필요가 없다.
 */
export async function linkLessonVideo(
  lessonId: string,
  result: { assetId: string; playbackId: string; durationSec: number | null },
  source: 'poll' | 'refresh' | 'webhook',
): Promise<{ error: PostgrestError | null }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('lessons')
    .update({
      mux_asset_id: result.assetId,
      mux_playback_id: result.playbackId,
      // 완료된 업로드는 "진행 중" 표시를 지운다(편집기 재진입 시 폴링 재개 판정 기준).
      mux_upload_id: null,
      // 재생시간은 Mux가 인코딩 중 측정한 실제 길이다. null이면 기존 값을 덮지 않는다 —
      // 영상 없이 손으로 넣어둔 값이 있을 수 있다.
      ...(result.durationSec !== null ? { duration_sec: result.durationSec } : {}),
      // 재업로드가 성공했는데 옛 실패 사유가 남아 운영자를 헷갈리게 하면 안 된다.
      mux_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lessonId);

  if (error) return { error };

  // DC-51 · 영상이 붙으면 상세 커리큘럼의 hasVideo·재생시간이 바뀐다.
  // 이 무효화가 헬퍼 안에 있다는 사실을 cache-tags.test.ts가 알고 있어야 한다(스캐너 참조).
  revalidateTag(CATALOG_TAG);

  // 완료 기록은 이 한 줄이 유일한 흔적이다 — 없으면 "왜 DB가 비었나"를 사후에 추적할
  // 방법이 없다(실제로 그 상황을 겪었다). 어느 경로로 채워졌는지까지 남긴다.
  console.info(
    `[mux] lesson ${lessonId} linked via ${source}: asset=${result.assetId} duration=${result.durationSec ?? 'none'}`,
  );
  return { error: null };
}

/**
 * 인코딩 실패를 차시에 남긴다.
 *
 * 사유를 DB에 적는 이유: 웹훅이 도착하는 시점에는 그 응답을 볼 브라우저가 없을 수 있다
 * (운영자가 업로드 후 편집기를 떠난 뒤 실패). 응답으로만 흘려보내면 운영자는 영상이
 * 왜 안 붙었는지 영영 알 수 없다.
 *
 * 진행 중 표시(mux_upload_id)도 함께 지운다 — 남겨두면 편집기에 다시 들어올 때마다
 * 끝나지 않을 폴링이 되살아난다.
 */
export async function markLessonVideoFailed(
  lessonId: string,
  reason: string,
  opts: { onlyUploadId?: string } = {},
): Promise<{ error: PostgrestError | null }> {
  const admin = createAdminClient();
  let q = admin
    .from('lessons')
    .update({ mux_upload_id: null, mux_error: reason, updated_at: new Date().toISOString() })
    .eq('id', lessonId);
  // 폴링 경로는 "내가 지켜보던 그 업로드"일 때만 지운다(그 사이 새 업로드가 시작됐을 수 있다).
  if (opts.onlyUploadId) q = q.eq('mux_upload_id', opts.onlyUploadId);

  const { error } = await q;
  if (error) return { error };
  console.warn(`[mux] lesson ${lessonId} video failed: ${reason}`);
  return { error: null };
}
