/**
 * DC-111 · Mux 웹훅 페이로드 → 행동 판정.
 *
 * 라우트는 Supabase 클라이언트에 묶여 있어 테스트에서 import할 수 없다. 그래서 "이
 * 통보로 무엇을 할 것인가"만 순수 함수로 떼어 둔다(lib/mux/ttl · lib/payments/policy와
 * 같은 규약).
 *
 * 여기서 **상태를 결정하지 않는다.** 페이로드가 ready라고 말해도 그건 힌트일 뿐이고,
 * 실제 자산 상태는 호출부가 getAssetResult()로 Mux에 다시 물어본다(Toss 웹훅이 세운
 * "페이로드 불신뢰" 규약과 같다). 이 모듈이 뽑는 것은 어느 차시·어느 자산인가뿐이다.
 */

export type MuxWebhookAction =
  | { kind: 'link'; assetId: string; lessonId: string; uploadId: string | null }
  | { kind: 'error'; lessonId: string; reason: string; assetId: string | null; uploadId: string | null }
  | { kind: 'ignore'; why: string };

/** passthrough에는 차시 id(UUID)를 심어 두었다 — 그 형태가 아니면 우리 것이 아니다. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** 인코딩 실패 사유를 운영자가 읽을 수 있는 한 문장으로. */
function errorReason(data: Record<string, unknown>): string {
  const errors = asRecord(data.errors);
  const messages = errors?.messages;
  if (Array.isArray(messages)) {
    const joined = messages.filter((m): m is string => typeof m === 'string' && m.trim() !== '').join(' / ');
    if (joined !== '') return joined;
  }
  return '영상 인코딩에 실패했습니다. 파일을 확인한 뒤 다시 올려 주세요.';
}

export function decideWebhookAction(event: unknown): MuxWebhookAction {
  const root = asRecord(event);
  if (!root) return { kind: 'ignore', why: 'payload-not-object' };

  const type = root.type;
  if (typeof type !== 'string') return { kind: 'ignore', why: 'no-event-type' };

  // 관심 있는 것은 자산의 종결 상태 둘뿐이다. video.upload.* 나 live.* 등은 전부 흘려보낸다
  // (Mux는 기본적으로 모든 이벤트를 같은 주소로 보낸다).
  if (type !== 'video.asset.ready' && type !== 'video.asset.errored') {
    return { kind: 'ignore', why: `unhandled-type:${type}` };
  }

  const data = asRecord(root.data);
  if (!data) return { kind: 'ignore', why: 'no-data' };

  const passthrough = data.passthrough;
  if (typeof passthrough !== 'string' || !UUID_RE.test(passthrough.trim())) {
    // 콘솔에서 손으로 만든 자산이나 이 앱 밖에서 올린 자산이 여기로 들어온다.
    return { kind: 'ignore', why: 'no-lesson-passthrough' };
  }
  const lessonId = passthrough.trim();

  // 자산·업로드 식별자는 교체 업로드 경쟁을 가려내는 열쇠다(shouldApplyAssetEvent).
  // **실패 통보에서도 반드시 뽑는다** — 여기서 null로 두면 "이미 다른 자산이 연결됨"
  // 판정이 통째로 무력해져, 옛 실패가 멀쩡한 차시에 오류를 남긴다(실측으로 확인).
  const rawUploadId = data.upload_id;
  const uploadId =
    typeof rawUploadId === 'string' && rawUploadId.trim() !== '' ? rawUploadId.trim() : null;
  const rawAssetId = data.id;
  const assetId =
    typeof rawAssetId === 'string' && rawAssetId.trim() !== '' ? rawAssetId.trim() : null;

  if (type === 'video.asset.errored') {
    return { kind: 'error', lessonId, reason: errorReason(data), assetId, uploadId };
  }

  if (!assetId) return { kind: 'ignore', why: 'no-asset-id' };

  return { kind: 'link', assetId, lessonId, uploadId };
}

/**
 * 이 통보를 차시에 적용해도 되는가 — **늦게 도착한 옛 자산의 통보를 걸러낸다.**
 *
 * 운영자가 영상을 "교체"하면 한 차시에 자산이 둘 이상 얽힌다. 옛 자산의 인코딩이 늦게
 * 끝나 통보가 뒤늦게 도착하면, 차시 id만 보고 쓰는 구조에서는 **옛 재생 ID가 새 영상을
 * 덮어쓴다** — 수강생이 엉뚱한 옛 영상을 보게 된다. 실패 통보 쪽도 마찬가지로, 진행
 * 중인 새 업로드의 표식을 지워 편집기가 추적을 잃는다.
 *
 * 판정 기준은 "차시가 지금 무엇을 기다리고 있는가"다:
 *   - 기다리는 업로드가 있으면 → 그 업로드에서 난 자산만 받는다
 *   - 기다리는 것이 없으면    → 이미 연결된 자산과 같을 때만 받는다(멱등 재적용)
 *     · 연결된 자산이 아예 없으면 첫 연결이므로 받는다
 *
 * 폴링 경로가 쓰는 onlyUploadId 가드와 같은 규약이며, 이쪽은 성공 경로까지 덮는다.
 */
export function shouldApplyAssetEvent(input: {
  eventAssetId: string | null;
  eventUploadId: string | null;
  lessonUploadId: string | null;
  lessonAssetId: string | null;
}): { apply: true } | { apply: false; why: string } {
  const { eventAssetId, eventUploadId, lessonUploadId, lessonAssetId } = input;

  if (lessonUploadId) {
    if (!eventUploadId) {
      // 상관을 지을 수 없는데 기다리는 업로드는 있다 — 덮어쓰기보다 흘려보내는 쪽이 안전하다
      // (폴링·수동 복구가 이중화로 남아 있다).
      return { apply: false, why: 'stale-event:no-upload-correlation' };
    }
    if (eventUploadId !== lessonUploadId) {
      return { apply: false, why: 'stale-event:superseded-by-newer-upload' };
    }
    return { apply: true };
  }

  // 기다리는 업로드가 없다 = 이미 정리가 끝난 상태다. 다른 자산 통보가 지금 오면 늦은 것이다.
  if (lessonAssetId && eventAssetId && lessonAssetId !== eventAssetId) {
    return { apply: false, why: 'stale-event:another-asset-already-linked' };
  }
  return { apply: true };
}
