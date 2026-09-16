import { describe, expect, it } from 'vitest';
import { beatOpacity, clamp, lerp, progressToTime, scrollProgress } from './progress';

describe('clamp', () => {
  it('범위 안의 값은 그대로 둔다', () => {
    expect(clamp(0.42)).toBe(0.42);
  });

  it('범위 밖은 자른다', () => {
    expect(clamp(-3)).toBe(0);
    expect(clamp(9)).toBe(1);
  });

  it('NaN은 하한으로 떨어뜨린다', () => {
    // rectTop이 아직 측정되지 않은 첫 프레임에서 NaN이 새어 들어오면
    // video.currentTime = NaN 이 되어 재생 위치가 통째로 깨진다.
    expect(clamp(Number.NaN)).toBe(0);
  });
});

describe('lerp', () => {
  it('양 끝과 중간을 보간한다', () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
    expect(lerp(10, 20, 0.5)).toBe(15);
  });
});

describe('scrollProgress', () => {
  const TRACK = 4000;
  const VIEW = 1000;
  // 스크롤 예산 = 4000 - 1000 = 3000px

  it('트랙 상단이 뷰포트 상단에 닿기 전에는 0이다', () => {
    expect(scrollProgress(500, TRACK, VIEW)).toBe(0);
  });

  it('막 닿은 순간이 0이다', () => {
    expect(scrollProgress(0, TRACK, VIEW)).toBe(0);
  });

  it('예산의 절반을 지나면 0.5다', () => {
    expect(scrollProgress(-1500, TRACK, VIEW)).toBe(0.5);
  });

  it('예산을 다 쓰면 1이다', () => {
    expect(scrollProgress(-3000, TRACK, VIEW)).toBe(1);
  });

  it('트랙을 지나쳐도 1을 넘지 않는다', () => {
    expect(scrollProgress(-99999, TRACK, VIEW)).toBe(1);
  });

  it('트랙이 뷰포트보다 짧으면 0으로 고정한다', () => {
    // 예산이 0 이하면 -rectTop/0 = Infinity 가 되어 진행률이 튄다.
    expect(scrollProgress(-100, 600, 1000)).toBe(0);
    expect(scrollProgress(-100, 1000, 1000)).toBe(0);
  });
});

describe('progressToTime', () => {
  it('진행률 0은 재생 위치 0이다', () => {
    expect(progressToTime(0, 8)).toBe(0);
  });

  it('진행률 1에서도 마지막 프레임 한 장을 남긴다', () => {
    // 정확히 duration에 닿으면 ended 처리되거나 첫 프레임으로 되감긴다.
    const t = progressToTime(1, 8, 24);
    expect(t).toBeCloseTo(8 - 1 / 24, 5);
    expect(t).toBeLessThan(8);
  });

  it('중간 진행률을 비례 배분한다', () => {
    expect(progressToTime(0.5, 8, 24)).toBeCloseTo((8 - 1 / 24) / 2, 5);
  });

  it('duration이 아직 없으면(NaN·0) 0을 돌려준다', () => {
    // 메타데이터 로드 전 video.duration은 NaN이다.
    expect(progressToTime(0.5, Number.NaN)).toBe(0);
    expect(progressToTime(0.5, 0)).toBe(0);
  });
});

describe('beatOpacity', () => {
  const FADE = 0.06;

  it('구간 안에서는 완전히 보인다', () => {
    expect(beatOpacity(0.3, 0.2, 0.45, FADE)).toBe(1);
  });

  it('구간에 들어오기 전에는 서서히 나타난다', () => {
    expect(beatOpacity(0.2 - FADE, 0.2, 0.45, FADE)).toBe(0);
    expect(beatOpacity(0.2 - FADE / 2, 0.2, 0.45, FADE)).toBeCloseTo(0.5, 5);
  });

  it('구간을 지나면 서서히 사라진다', () => {
    expect(beatOpacity(0.45 + FADE, 0.2, 0.45, FADE)).toBe(0);
    expect(beatOpacity(0.45 + FADE / 2, 0.2, 0.45, FADE)).toBeCloseTo(0.5, 5);
  });

  it('페이드 폭 바깥은 완전히 숨긴다', () => {
    expect(beatOpacity(0, 0.2, 0.45, FADE)).toBe(0);
    expect(beatOpacity(1, 0.2, 0.45, FADE)).toBe(0);
  });

  it('첫 비트는 진입 페이드를 생략해 처음부터 보인다', () => {
    // 진행률 0에서 h1이 투명하면 LCP 텍스트가 사라진다.
    expect(beatOpacity(0, 0, 0.2, FADE, { fadeIn: false })).toBe(1);
  });

  it('마지막 비트는 퇴장 페이드를 생략해 끝까지 남는다', () => {
    // CTA가 트랙 끝에서 사라지면 전환 지점이 비어 버린다.
    expect(beatOpacity(1, 0.7, 1, FADE, { fadeOut: false })).toBe(1);
  });

  it('이웃한 두 비트의 불투명도 합이 교차 지점에서 1이다', () => {
    // 교차 페이드가 어긋나면 경계에서 화면이 한 번 비거나 두 겹으로 겹친다.
    const boundary = 0.45;
    const leaving = beatOpacity(boundary + FADE / 2, 0.2, boundary, FADE);
    const entering = beatOpacity(boundary + FADE / 2, boundary + FADE, 0.7, FADE);
    expect(leaving + entering).toBeCloseTo(1, 5);
  });
});
