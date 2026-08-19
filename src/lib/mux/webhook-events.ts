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
  | { kind: 'link'; assetId: string; lessonId: string }
  | { kind: 'error'; lessonId: string; reason: string }
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

  if (type === 'video.asset.errored') {
    return { kind: 'error', lessonId, reason: errorReason(data) };
  }

  const assetId = data.id;
  if (typeof assetId !== 'string' || assetId.trim() === '') {
    return { kind: 'ignore', why: 'no-asset-id' };
  }

  return { kind: 'link', assetId: assetId.trim(), lessonId };
}
