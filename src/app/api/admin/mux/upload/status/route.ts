import { assertSameOrigin } from '@/lib/api/origin';
import { problem, problemWithCause } from '@/lib/api/problem';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getUploadResult } from '@/lib/mux/client';
import { linkLessonVideo, markLessonVideoFailed } from '@/lib/mux/link-lesson';
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
    return problem(400, 'invalid-request', 'Invalid request body', '요청 형식이 올바르지 않습니다.');
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
    // 저장은 세 경로(폴링·수동 복구·웹훅)가 공유하는 linkLessonVideo가 전담한다 — 캐시
    // 무효화와 완료 로그도 그 안에 있다.
    const { error } = await linkLessonVideo(
      lessonId,
      { assetId: result.assetId, playbackId: result.playbackId, durationSec: result.durationSec },
      'poll',
    );
    if (error) {
      return problemWithCause(
        500,
        'lesson-update-failed',
        'Lesson update failed',
        '차시 정보를 저장하지 못했습니다.',
        error,
      );
    }
  } else if (result.state === 'errored') {
    // 실패한 업로드를 남겨두면 편집기가 재진입할 때마다 끝나지 않을 폴링을 되살린다.
    // 사유를 DB에도 남긴다 — 이 응답을 볼 브라우저가 없는 경우(웹훅 경로)와 표시를 맞춘다.
    await markLessonVideoFailed(lessonId, result.reason ?? '영상 처리에 실패했습니다.', {
      onlyUploadId: uploadId,
    });
  }

  // 사유·재생시간 유무를 함께 내려보낸다 — 클라이언트가 실패를 한 문장으로 뭉개지 않도록,
  // 그리고 재생시간만 빠진 경우(재생은 되는데 --:--)를 운영자가 알아채고 복구할 수 있도록.
  return NextResponse.json({
    state: result.state,
    reason: result.reason,
    durationMissing: result.state === 'ready' && result.durationSec === null,
  });
}
