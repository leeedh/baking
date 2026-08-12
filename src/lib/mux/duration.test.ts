import { describe, expect, it } from 'vitest';
import { muxDurationToSec } from './duration';

describe('muxDurationToSec', () => {
  it('소수 초를 반올림해 정수로 만든다', () => {
    expect(muxDurationToSec(125.4)).toBe(125);
    expect(muxDurationToSec(125.6)).toBe(126);
    expect(muxDurationToSec(600)).toBe(600);
  });

  it('값이 없으면 null — 호출부가 기존 duration_sec를 덮지 않게 한다', () => {
    expect(muxDurationToSec(null)).toBeNull();
    expect(muxDurationToSec(undefined)).toBeNull();
  });

  it('비정상 값(NaN·Infinity·0 이하)은 null', () => {
    expect(muxDurationToSec(Number.NaN)).toBeNull();
    expect(muxDurationToSec(Number.POSITIVE_INFINITY)).toBeNull();
    expect(muxDurationToSec(0)).toBeNull();
    expect(muxDurationToSec(-30)).toBeNull();
  });

  it('1초 미만 클립은 0이 아니라 1초 — 0은 "미상"과 구분되지 않는다', () => {
    expect(muxDurationToSec(0.4)).toBe(1);
    expect(muxDurationToSec(0.9)).toBe(1);
  });

  it('숫자가 아닌 값도 방어한다(Mux 응답 타입이 느슨하다)', () => {
    expect(muxDurationToSec('120' as unknown as number)).toBeNull();
  });
});
