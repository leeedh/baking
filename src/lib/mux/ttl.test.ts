import { describe, expect, it } from 'vitest';
import {
  PLAYBACK_TOKEN_FALLBACK_TTL_SEC,
  PLAYBACK_TOKEN_MAX_TTL_SEC,
  PLAYBACK_TOKEN_MIN_TTL_SEC,
  playbackTokenTtlSec,
} from './ttl';

// 이 상한이 곧 "환불 후에도 시청 가능한 최대 시간"이다(Mux 서명 JWT는 발급 후 취소 불가).
describe('playbackTokenTtlSec', () => {
  it('duration을 모르면 폴백 만료', () => {
    expect(playbackTokenTtlSec(null)).toBe(PLAYBACK_TOKEN_FALLBACK_TTL_SEC);
    expect(playbackTokenTtlSec(undefined)).toBe(PLAYBACK_TOKEN_FALLBACK_TTL_SEC);
    expect(playbackTokenTtlSec(0)).toBe(PLAYBACK_TOKEN_FALLBACK_TTL_SEC);
    expect(playbackTokenTtlSec(-10)).toBe(PLAYBACK_TOKEN_FALLBACK_TTL_SEC);
  });

  it('짧은 차시도 하한 아래로 내려가지 않는다', () => {
    expect(playbackTokenTtlSec(60)).toBe(PLAYBACK_TOKEN_MIN_TTL_SEC);
  });

  it('긴 차시는 상한에서 잘린다 — 비정상 duration으로 TTL을 늘릴 수 없다', () => {
    expect(playbackTokenTtlSec(60 * 60 * 24)).toBe(PLAYBACK_TOKEN_MAX_TTL_SEC);
    expect(playbackTokenTtlSec(Number.MAX_SAFE_INTEGER)).toBe(PLAYBACK_TOKEN_MAX_TTL_SEC);
  });

  it('중간 길이는 길이의 3배', () => {
    const fortyMinutes = 40 * 60;
    expect(playbackTokenTtlSec(fortyMinutes)).toBe(fortyMinutes * 3);
  });
});
