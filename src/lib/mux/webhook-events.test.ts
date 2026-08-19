import { describe, expect, it } from 'vitest';
import { decideWebhookAction } from './webhook-events';

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
    });
  });

  it('video.asset.errored → 사유를 붙여 error로', () => {
    const action = decideWebhookAction({
      type: 'video.asset.errored',
      data: { id: 'asset_abc', passthrough: LESSON, errors: { messages: ['bad codec', 'no audio'] } },
    });
    expect(action).toEqual({ kind: 'error', lessonId: LESSON, reason: 'bad codec / no audio' });
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
    expect(action).toEqual({ kind: 'link', assetId: 'asset_abc', lessonId: LESSON });
  });

  it('무시 사유를 남긴다 — 로그에서 왜 흘려보냈는지 알 수 있어야 한다', () => {
    const action = decideWebhookAction({ type: 'video.upload.created', data: {} });
    expect(action.kind === 'ignore' && action.why).toBe('unhandled-type:video.upload.created');
  });
});
