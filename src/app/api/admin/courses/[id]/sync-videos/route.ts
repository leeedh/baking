import { assertSameOrigin } from '@/lib/api/origin';
import { problem, problemWithCause } from '@/lib/api/problem';
import { requireAdmin } from '@/lib/auth/require-admin';
import { CATALOG_TAG } from '@/lib/cache-tags';
import { listAssetLinks } from '@/lib/mux/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * 커리큘럼 영상 동기화 — Mux에 올라가 있는데 차시에 연결되지 않은 영상을 되찾아 붙인다.
 *
 * 왜 필요한가: 인코딩 완료를 **브라우저 폴링만** 받아 적는 구조라(Mux 웹훅 미도입), 폴링이
 * 한 번 끊기면 파일은 Mux에 멀쩡한데 차시에는 아무것도 안 남는다. 실제로 재생 ID·자산 ID·
 * 업로드 ID가 전부 비어 재업로드 말고는 방법이 없는 차시가 나왔다.
 *
 * 그래서 자산에 `passthrough = lessonId`를 새겨 두고(createDirectUpload), 여기서는 그 표식만
 * 보고 되짚는다. **DB에 남은 단서가 하나도 없어도 복구된다**는 것이 이 라우트의 요점이다.
 * 차시별 `refresh-video`는 저장된 id가 있을 때의 빠른 길이고, 이쪽이 상위 안전망이다.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // /api는 미들웨어 밖이라 Route Handler가 스스로 막아야 한다(TS-SEC CSRF).
  const crossOrigin = assertSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const denied = await requireAdmin();
  if (denied) return denied;

  const { id: courseId } = await params;

  const admin = createAdminClient();
  const { data: lessons, error: readError } = await admin
    .from('lessons')
    .select('id, mux_playback_id, duration_sec')
    .eq('course_id', courseId);
  if (readError) {
    return problemWithCause(
      500,
      'lesson-read-failed',
      'Lesson read failed',
      '커리큘럼을 불러오지 못했습니다.',
      readError,
    );
  }
  if (!lessons || lessons.length === 0) {
    return NextResponse.json({ linked: 0 });
  }

  let links: Awaited<ReturnType<typeof listAssetLinks>>;
  try {
    links = await listAssetLinks();
  } catch (e) {
    return problem(
      503,
      'mux-unavailable',
      'Mux unavailable',
      e instanceof Error ? e.message : 'Mux 자산 목록을 조회할 수 없습니다.',
    );
  }

  // 이 클래스의 차시만, 그리고 아직 재생 ID가 없거나 재생시간이 빈 것만 손댄다 —
  // 이미 정상인 차시를 매번 덮어쓰면 운영자가 손으로 넣은 값까지 지워질 수 있다.
  const byId = new Map(lessons.map((l) => [l.id, l]));
  const targets = links.filter((link) => {
    const lesson = byId.get(link.lessonId);
    if (!lesson) return false;
    return !lesson.mux_playback_id || (lesson.duration_sec === null && link.durationSec !== null);
  });

  const now = new Date().toISOString();
  let linked = 0;
  for (const link of targets) {
    const { error } = await admin
      .from('lessons')
      .update({
        mux_asset_id: link.assetId,
        mux_playback_id: link.playbackId,
        mux_upload_id: null,
        ...(link.durationSec !== null ? { duration_sec: link.durationSec } : {}),
        updated_at: now,
      })
      .eq('id', link.lessonId);
    if (error) {
      return problemWithCause(
        500,
        'lesson-update-failed',
        'Lesson update failed',
        '차시에 영상을 연결하지 못했습니다.',
        error,
      );
    }
    linked += 1;
  }

  if (linked > 0) {
    console.info(`[mux] sync-videos: course ${courseId} — ${linked}개 차시에 영상을 연결했다.`);
    // DC-51 · 재생 가능 여부와 재생시간이 상세 커리큘럼에 그대로 나간다.
    revalidateTag(CATALOG_TAG);
  }

  return NextResponse.json({ linked });
}
