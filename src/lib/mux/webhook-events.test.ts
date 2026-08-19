import { describe, expect, it } from 'vitest';
import { decideWebhookAction, shouldApplyAssetEvent } from './webhook-events';

const LESSON = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const ready = (over: Record<string, unknown> = {}) => ({
  type: 'video.asset.ready',
  data: { id: 'asset_abc', passthrough: LESSON, status: 'ready', ...over },
});

describe('decideWebhookAction (DC-111)', () => {
  it('video.asset.ready → 차시와 자산을 뽑는다', () => {
    expect(decideWebhookAction(ready())).toEqual({
      kind: 'link',
      assetId: 'asset_abc',
      lessonId: LESSON,
      uploadId: null,
    });
  });

  it('video.asset.errored → 사유를 붙여 error로', () => {
    const action = decideWebhookAction({
      type: 'video.asset.errored',
      data: { id: 'asset_abc', passthrough: LESSON, errors: { messages: ['bad codec', 'no audio'] } },
    });
    expect(action).toEqual({
      kind: 'error',
      lessonId: LESSON,
      reason: 'bad codec / no audio',
      assetId: 'asset_abc',
      uploadId: null,
    });
  });

  it('사유가 비어 있어도 운영자가 읽을 문장으로 폴백한다', () => {
    const action = decideWebhookAction({
      type: 'video.asset.errored',
      data: { id: 'a', passthrough: LESSON, errors: { messages: [] } },
    });
    expect(action.kind).toBe('error');
    expect(action.kind === 'error' && action.reason).toContain('다시 올려');
  });

  // --- 아래는 전부 무시되어야 하는 경로다. 하나라도 link로 새면 엉뚱한 차시에
  // --- 재생 ID가 박히거나, 남의 자산이 우리 DB를 건드린다.
  it.each([
    ['passthrough 없음', { type: 'video.asset.ready', data: { id: 'a' } }],
    ['passthrough가 UUID가 아님', { type: 'video.asset.ready', data: { id: 'a', passthrough: 'lesson-1' } }],
    ['자산 id 없음', { type: 'video.asset.ready', data: { passthrough: LESSON } }],
    ['자산 id가 빈 문자열', { type: 'video.asset.ready', data: { id: '   ', passthrough: LESSON } }],
    ['data 없음', { type: 'video.asset.ready' }],
    ['관심 없는 이벤트', { type: 'video.upload.asset_created', data: { passthrough: LESSON } }],
    ['라이브 이벤트', { type: 'video.live_stream.active', data: { passthrough: LESSON } }],
    ['type 없음', { data: { id: 'a', passthrough: LESSON } }],
    ['빈 객체', {}],
    ['null', null],
    ['배열', [{ type: 'video.asset.ready' }]],
    ['문자열', 'video.asset.ready'],
  ])('%s → ignore', (_label, payload) => {
    expect(decideWebhookAction(payload).kind).toBe('ignore');
  });

  it('passthrough 주변 공백은 다듬는다', () => {
    const action = decideWebhookAction(ready({ passthrough: ` ${LESSON} ` }));
    expect(action).toEqual({
      kind: 'link',
      assetId: 'asset_abc',
      lessonId: LESSON,
      uploadId: null,
    });
  });

  it('무시 사유를 남긴다 — 로그에서 왜 흘려보냈는지 알 수 있어야 한다', () => {
    const action = decideWebhookAction({ type: 'video.upload.created', data: {} });
    expect(action.kind === 'ignore' && action.why).toBe('unhandled-type:video.upload.created');
  });
});

describe('shouldApplyAssetEvent — 교체 업로드 경쟁 (Codex 리뷰 P2)', () => {
  const base = {
    eventAssetId: 'asset_old',
    eventUploadId: 'upload_old',
    lessonUploadId: null as string | null,
    lessonAssetId: null as string | null,
  };

  it('기다리던 바로 그 업로드의 자산이면 적용한다', () => {
    expect(
      shouldApplyAssetEvent({ ...base, lessonUploadId: 'upload_old' }).apply,
    ).toBe(true);
  });

  it('첫 연결(연결된 자산도 기다리는 업로드도 없음)은 적용한다', () => {
    expect(shouldApplyAssetEvent(base).apply).toBe(true);
  });

  it('같은 자산의 통보가 다시 와도 적용한다 — 멱등 재적용', () => {
    expect(
      shouldApplyAssetEvent({ ...base, lessonAssetId: 'asset_old' }).apply,
    ).toBe(true);
  });

  // --- 아래가 Codex가 지적한 결함이다. 하나라도 통과하면 교체 중인 영상이 옛것으로
  // --- 되돌아가거나(ready), 진행 중인 새 업로드의 표식이 지워진다(errored).
  it('교체 업로드가 진행 중이면 옛 자산의 늦은 통보를 버린다', () => {
    const r = shouldApplyAssetEvent({
      eventAssetId: 'asset_old',
      eventUploadId: 'upload_old',
      lessonUploadId: 'upload_new',
      lessonAssetId: 'asset_old',
    });
    expect(r.apply).toBe(false);
    expect(r.apply === false && r.why).toContain('superseded');
  });

  it('업로드를 기다리는데 상관 지을 수 없는 통보는 버린다', () => {
    const r = shouldApplyAssetEvent({ ...base, eventUploadId: null, lessonUploadId: 'upload_new' });
    expect(r.apply).toBe(false);
    expect(r.apply === false && r.why).toContain('no-upload-correlation');
  });

  it('이미 다른 자산이 연결된 뒤 도착한 옛 통보는 버린다', () => {
    const r = shouldApplyAssetEvent({
      eventAssetId: 'asset_old',
      eventUploadId: 'upload_old',
      lessonUploadId: null,
      lessonAssetId: 'asset_new',
    });
    expect(r.apply).toBe(false);
    expect(r.apply === false && r.why).toContain('another-asset-already-linked');
  });
});

describe('decideWebhookAction — upload_id 추출', () => {
  it('자산이 어느 업로드에서 났는지 함께 뽑는다', () => {
    const a = decideWebhookAction({
      type: 'video.asset.ready',
      data: { id: 'asset_abc', passthrough: LESSON, upload_id: ' upload_xyz ' },
    });
    expect(a.kind === 'link' && a.uploadId).toBe('upload_xyz');
  });

  it('실패 통보에서도 뽑는다 — 옛 실패가 새 업로드를 지우지 못하게 하는 근거', () => {
    const a = decideWebhookAction({
      type: 'video.asset.errored',
      data: { id: 'a', passthrough: LESSON, upload_id: 'upload_xyz' },
    });
    expect(a.kind === 'error' && a.uploadId).toBe('upload_xyz');
  });

  it('업로드 없이 만들어진 자산은 null', () => {
    const a = decideWebhookAction({
      type: 'video.asset.ready',
      data: { id: 'a', passthrough: LESSON, upload_id: '' },
    });
    expect(a.kind === 'link' && a.uploadId).toBeNull();
  });
});

describe('실패 통보의 자산 식별자 (스모크에서 잡힌 회귀)', () => {
  // 처음엔 error 액션에서 assetId를 안 뽑았다. 그러자 "이미 다른 자산이 연결됨" 판정이
  // 무력해져, 옛 자산의 늦은 실패 통보가 멀쩡히 재생되던 차시에 오류를 남겼다
  // (프로덕션 스모크에서 실제로 재현됨 — 테스트만으로는 안 잡혔다).
  it('실패 통보도 자산 식별자를 싣는다', () => {
    const a = decideWebhookAction({
      type: 'video.asset.errored',
      data: { id: 'asset_old', passthrough: LESSON, upload_id: 'u_old' },
    });
    expect(a.kind === 'error' && a.assetId).toBe('asset_old');
  });

  it('그 식별자로 옛 실패 통보가 걸러진다', () => {
    const a = decideWebhookAction({
      type: 'video.asset.errored',
      data: { id: 'asset_old', passthrough: LESSON, upload_id: 'u_old' },
    });
    const gate = shouldApplyAssetEvent({
      eventAssetId: a.kind === 'error' ? a.assetId : null,
      eventUploadId: a.kind === 'error' ? a.uploadId : null,
      lessonUploadId: null,
      lessonAssetId: 'asset_new',
    });
    expect(gate.apply).toBe(false);
  });
});
