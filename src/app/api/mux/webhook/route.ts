import { problem } from '@/lib/api/problem';
import { getAssetResult, verifyWebhookSignature } from '@/lib/mux/client';
import { getMuxWebhookSecret } from '@/lib/mux/env';
import { linkLessonVideo, markLessonVideoFailed } from '@/lib/mux/link-lesson';
import { decideWebhookAction } from '@/lib/mux/webhook-events';
import { NextResponse } from 'next/server';

/**
 * DC-111 · Mux 인코딩 완료 통보 수신 (TS-API-16).
 *
 * 왜 필요한가: 지금까지 인코딩 완료를 아는 것은 **브라우저뿐**이었다. 편집기가 3초마다
 * 물어보고, 완료를 확인한 그 순간에만 차시에 재생 정보가 기록된다. 그래서 화면을 떠나거나
 * 새로고침하거나 네트워크가 끊기면 영상은 Mux에 멀쩡히 있는데 차시에는 아무것도 안 남고,
 * 수강생은 재생이 막힌다(DC-110에서 실제로 발생). 이 라우트가 그 구조를 뒤집는다.
 *
 * ── 신뢰 경계 ────────────────────────────────────────────────────────────────
 * 외부 발신자이므로 requireAdmin()도 assertSameOrigin()도 **일부러 걸지 않는다**
 * (Toss 웹훅과 같은 판단). 미들웨어도 /api를 제외하므로 이 라우트를 지키는 것은 딱 두 겹뿐:
 *
 *   1) Mux 서명 검증 — 발신자가 Mux인지
 *   2) Mux 재조회    — 페이로드가 말하는 상태를 믿지 않고 원본에서 다시 읽는다
 *
 * 그래서 이 파일에 **다른 쓰기를 절대 추가하지 말 것.** 여기서 할 수 있는 일은
 * "인코딩이 끝난 자산을 그 자산이 지목한 차시에 붙인다"뿐이어야 한다.
 *
 * 응답 규약: 처리했든 흘려보냈든 200을 준다(미지원 이벤트에 4xx를 주면 Mux가 재시도를
 * 반복한다). 5xx는 "나중에 다시 보내 달라"는 뜻일 때만 쓴다.
 */

export async function POST(request: Request) {
  const secret = getMuxWebhookSecret();
  if (!secret) {
    // 키 없이 배포되는 현 관행(재생 토큰 라우트의 503 mux-unconfigured)과 같은 분기.
    console.warn('[mux-webhook] MUX_WEBHOOK_SECRET 미설정 — 통보를 처리할 수 없다.');
    return problem(
      503,
      'mux-webhook-unconfigured',
      'Mux webhook not configured',
      'Mux 웹훅이 아직 설정되지 않았습니다.',
    );
  }

  const raw = await request.text();

  try {
    verifyWebhookSignature(raw, request.headers, secret);
  } catch (e) {
    // 위조 시도이거나 시크릿이 어긋난 것이다. 어느 쪽이든 재시도로 풀릴 일이 아니므로 401.
    console.warn(`[mux-webhook] 서명 검증 실패: ${e instanceof Error ? e.message : String(e)}`);
    return problem(401, 'invalid-signature', 'Invalid signature', '서명을 확인할 수 없습니다.');
  }

  let event: unknown;
  try {
    event = JSON.parse(raw);
  } catch {
    return problem(400, 'invalid-request', 'Invalid request body', '요청 형식이 올바르지 않습니다.');
  }

  const action = decideWebhookAction(event);

  if (action.kind === 'ignore') {
    // 무행동도 흔적을 남긴다 — 조용히 넘어가면 "왜 안 붙었나"를 사후에 못 쫓는다
    // (Toss 웹훅의 [webhook-no-action]과 같은 관행).
    console.info(`[mux-webhook-no-action] ${action.why}`);
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (action.kind === 'error') {
    const { error } = await markLessonVideoFailed(action.lessonId, action.reason);
    if (error) {
      // 저장 실패는 Mux가 다시 보내 주면 풀릴 수 있다.
      console.error(`[mux-webhook] 실패 사유 저장 실패 (lesson ${action.lessonId}):`, error.message);
      return problem(500, 'lesson-update-failed', 'Lesson update failed', '차시를 갱신하지 못했습니다.');
    }
    return NextResponse.json({ ok: true, lessonId: action.lessonId, state: 'errored' });
  }

  // 페이로드가 ready라고 말해도 그대로 믿지 않는다. getAssetResult()가 Mux에서 원본을
  // 다시 읽고, ready + **signed** 재생 ID를 모두 만족할 때만 값을 돌려준다(fail-closed).
  // 서명 검증이 뚫리더라도 이 한 겹이 잘못된 ID가 박히는 것을 막는다.
  let result: Awaited<ReturnType<typeof getAssetResult>>;
  try {
    result = await getAssetResult(action.assetId);
  } catch (e) {
    console.error(`[mux-webhook] 자산 재조회 실패 (${action.assetId}):`, e);
    // Mux 일시 장애일 수 있다 — 재시도를 받기 위해 5xx.
    return problem(503, 'mux-unavailable', 'Mux unavailable', 'Mux 상태를 조회할 수 없습니다.');
  }

  if (result.state !== 'ready' || !result.assetId || !result.playbackId) {
    const reason = result.reason ?? `자산이 아직 ${result.state} 상태입니다.`;
    if (result.state === 'errored') {
      await markLessonVideoFailed(action.lessonId, reason);
      return NextResponse.json({ ok: true, lessonId: action.lessonId, state: 'errored' });
    }
    // ready 통보를 받았는데 재조회는 아직 준비 중 — 드물지만 전파 지연으로 가능하다.
    // 폴링·수동 복구가 이중화로 살아 있으므로 여기서는 흘려보낸다.
    console.warn(`[mux-webhook] ${action.assetId}: ready 통보였으나 재조회는 ${result.state}`);
    return NextResponse.json({ ok: true, ignored: true, state: result.state });
  }

  const { error } = await linkLessonVideo(
    action.lessonId,
    { assetId: result.assetId, playbackId: result.playbackId, durationSec: result.durationSec },
    'webhook',
  );
  if (error) {
    console.error(`[mux-webhook] 차시 저장 실패 (lesson ${action.lessonId}):`, error.message);
    return problem(500, 'lesson-update-failed', 'Lesson update failed', '차시 정보를 저장하지 못했습니다.');
  }

  return NextResponse.json({ ok: true, lessonId: action.lessonId, state: 'ready' });
}
