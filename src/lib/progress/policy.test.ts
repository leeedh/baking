import { describe, expect, it } from 'vitest';
import { COMPLETION_RATIO, clampWatchedSec, deriveCompleted } from './policy';

// 진도는 되돌릴 경로가 없는 sticky 값이라, 위조된 완강이 한 번 들어가면 영구히 남는다(M-6).
describe('clampWatchedSec', () => {
  it('duration을 넘는 시청 위치는 duration으로 잘린다 — 진도를 부풀릴 수 없다', () => {
    expect(clampWatchedSec(9999, 600)).toBe(600);
    expect(clampWatchedSec(Number.MAX_SAFE_INTEGER, 600)).toBe(600);
  });

  it('음수는 0으로', () => {
    expect(clampWatchedSec(-1, 600)).toBe(0);
    expect(clampWatchedSec(-1, null)).toBe(0);
  });

  it('범위 안의 값은 그대로', () => {
    expect(clampWatchedSec(0, 600)).toBe(0);
    expect(clampWatchedSec(300, 600)).toBe(300);
    expect(clampWatchedSec(600, 600)).toBe(600);
  });

  it('duration을 모르면 상한 없이 음수만 걷어낸다', () => {
    expect(clampWatchedSec(9999, null)).toBe(9999);
    expect(clampWatchedSec(9999, undefined)).toBe(9999);
    expect(clampWatchedSec(9999, 0)).toBe(9999);
  });
});

describe('deriveCompleted', () => {
  const base = { durationSec: 600, clientCompleted: undefined, previousCompleted: false };

  it('완강 주장만으로는 완강이 되지 않는다 — M-6의 핵심', () => {
    expect(deriveCompleted({ ...base, watchedSec: 0, clientCompleted: true })).toBe(false);
    expect(deriveCompleted({ ...base, watchedSec: 10, clientCompleted: true })).toBe(false);
  });

  it('임계 이상 시청하면 클라이언트 주장 없이도 완강', () => {
    expect(deriveCompleted({ ...base, watchedSec: 600 * COMPLETION_RATIO })).toBe(true);
    expect(deriveCompleted({ ...base, watchedSec: 600 })).toBe(true);
  });

  it('임계 직전은 완강이 아니다', () => {
    expect(deriveCompleted({ ...base, watchedSec: 600 * COMPLETION_RATIO - 1 })).toBe(false);
  });

  it('sticky — 한 번 완강이면 되감아도 풀리지 않는다', () => {
    expect(
      deriveCompleted({ ...base, watchedSec: 0, clientCompleted: false, previousCompleted: true }),
    ).toBe(true);
  });

  it('duration을 모르면 클라이언트 값으로 폴백(도출 근거 없음)', () => {
    expect(
      deriveCompleted({ ...base, durationSec: null, watchedSec: 0, clientCompleted: true }),
    ).toBe(true);
    expect(
      deriveCompleted({ ...base, durationSec: 0, watchedSec: 0, clientCompleted: false }),
    ).toBe(false);
    expect(
      deriveCompleted({ ...base, durationSec: null, watchedSec: 0, clientCompleted: undefined }),
    ).toBe(false);
  });

  it('수동 "완강" 버튼 경로 — watchedSec=duration이면 완강', () => {
    // PlayerScreen.handleCompleteCurrentLesson이 보내는 형태.
    expect(deriveCompleted({ ...base, watchedSec: 600, clientCompleted: true })).toBe(true);
  });
});
