import { describe, expect, it } from 'vitest';
import { type MuxAssetLike, pickAssetLinks } from './asset-links';

const ready = (over: Partial<MuxAssetLike> = {}): MuxAssetLike => ({
  id: 'asset-1',
  status: 'ready',
  duration: 10.5,
  passthrough: 'lesson-1',
  playback_ids: [{ id: 'pb-1', policy: 'signed' }],
  ...over,
});

describe('pickAssetLinks', () => {
  it('ready·signed·passthrough가 모두 갖춰진 자산을 고른다', () => {
    expect(pickAssetLinks([ready()])).toEqual([
      { lessonId: 'lesson-1', assetId: 'asset-1', playbackId: 'pb-1', durationSec: 11 },
    ]);
  });

  it('공개(public) 재생 ID만 있으면 저장하지 않는다', () => {
    // 저장되면 서명 토큰 없이 재생 가능한 차시가 조용히 생긴다(코드리뷰 M-5).
    expect(pickAssetLinks([ready({ playback_ids: [{ id: 'pb-1', policy: 'public' }] })])).toEqual(
      [],
    );
  });

  it('재생 ID가 아예 없으면 건너뛴다', () => {
    expect(pickAssetLinks([ready({ playback_ids: null })])).toEqual([]);
  });

  it('인코딩이 안 끝난 자산은 건너뛴다', () => {
    expect(pickAssetLinks([ready({ status: 'preparing' })])).toEqual([]);
    expect(pickAssetLinks([ready({ status: 'errored' })])).toEqual([]);
  });

  it('차시 표식이 없는 자산은 이어 붙일 곳이 없다', () => {
    expect(pickAssetLinks([ready({ passthrough: undefined })])).toEqual([]);
    expect(pickAssetLinks([ready({ passthrough: '   ' })])).toEqual([]);
  });

  it('같은 차시에 자산이 여럿이면 목록에서 먼저 오는 것(최신)만 쓴다', () => {
    const links = pickAssetLinks([
      ready({ id: 'new', playback_ids: [{ id: 'pb-new', policy: 'signed' }] }),
      ready({ id: 'old', playback_ids: [{ id: 'pb-old', policy: 'signed' }] }),
    ]);
    expect(links).toHaveLength(1);
    expect(links[0].assetId).toBe('new');
  });

  it('재생시간이 이상하면 null로 두고 나머지는 그대로 이어 붙인다', () => {
    // 재생시간 하나 때문에 재생 자체를 포기하면 안 된다.
    const [link] = pickAssetLinks([ready({ duration: 0 })]);
    expect(link.playbackId).toBe('pb-1');
    expect(link.durationSec).toBeNull();
  });

  it('여러 차시를 한 번에 되짚는다', () => {
    const links = pickAssetLinks([
      ready({ id: 'a', passthrough: 'l1' }),
      ready({ id: 'b', passthrough: 'l2' }),
    ]);
    expect(links.map((l) => l.lessonId)).toEqual(['l1', 'l2']);
  });
});
