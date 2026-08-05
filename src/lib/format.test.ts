import { describe, expect, it } from 'vitest';
import { formatBytes, formatCount, formatDate, formatDateTime, formatKrw } from './format';

// 로케일을 명시하지 않은 toLocaleString()이 서버/브라우저에서 다르게 나와
// 하이드레이션이 깨지던 문제를 막는다(DC-65).
describe('formatKrw', () => {
  it('ko/en 모두 ₩ 기호와 자릿수 구분을 낸다 — 통화는 KRW 단일(TS-ADR-05)', () => {
    expect(formatKrw(129000, 'ko')).toContain('129,000');
    expect(formatKrw(129000, 'en')).toContain('129,000');
    expect(formatKrw(129000, 'ko')).toContain('₩');
    expect(formatKrw(129000, 'en')).toContain('₩');
  });

  it('소수점을 만들지 않는다 — 원화에 소수 단위는 없다', () => {
    expect(formatKrw(129000, 'ko')).not.toContain('.');
  });

  it('null·undefined는 0으로', () => {
    expect(formatKrw(null, 'ko')).toContain('0');
    expect(formatKrw(undefined, 'en')).toContain('0');
  });
});

describe('formatCount', () => {
  it('자릿수를 구분한다', () => {
    expect(formatCount(12345, 'ko')).toBe('12,345');
    expect(formatCount(12345, 'en')).toBe('12,345');
  });

  it('null은 0', () => {
    expect(formatCount(null, 'ko')).toBe('0');
  });
});

describe('formatDate', () => {
  const iso = '2026-08-05T00:00:00.000Z';

  it('로케일마다 다른 형식을 낸다 — ko-KR 하드코딩을 없앤 이유', () => {
    expect(formatDate(iso, 'ko')).not.toBe(formatDate(iso, 'en'));
  });

  it('en은 영문 월 이름을 쓴다', () => {
    expect(formatDate(iso, 'en')).toMatch(/Aug/);
  });

  it('빈 값·잘못된 날짜는 빈 문자열 — 화면에 Invalid Date를 내지 않는다', () => {
    expect(formatDate(null, 'ko')).toBe('');
    expect(formatDate(undefined, 'ko')).toBe('');
    expect(formatDate('not-a-date', 'ko')).toBe('');
  });

  // timeZone을 비워 두면 런타임 기본 시간대를 따라 서버(UTC)와 브라우저(KST)가 다른 날짜를
  // 렌더한다 — 하이드레이션이 깨지고 사용자에겐 날짜가 하루 밀려 보인다(Codex 리뷰 P1).
  it('자정 근처 UTC 타임스탬프를 KST 기준 날짜로 고정한다', () => {
    // 2026-08-05T15:30Z = 2026-08-06 00:30 KST → 표기는 8월 6일이어야 한다.
    expect(formatDate('2026-08-05T15:30:00.000Z', 'en')).toMatch(/Aug 6/);
    // 2026-08-05T14:30Z = 2026-08-05 23:30 KST → 아직 8월 5일.
    expect(formatDate('2026-08-05T14:30:00.000Z', 'en')).toMatch(/Aug 5/);
  });

  it('실행 환경의 TZ가 바뀌어도 같은 값을 낸다', () => {
    const iso = '2026-08-05T15:30:00.000Z';
    const prev = process.env.TZ;
    try {
      process.env.TZ = 'UTC';
      const inUtc = formatDate(iso, 'en');
      process.env.TZ = 'America/New_York';
      const inNy = formatDate(iso, 'en');
      expect(inUtc).toBe(inNy);
    } finally {
      process.env.TZ = prev;
    }
  });
});

describe('formatDateTime', () => {
  it('시각까지 포함한다', () => {
    const out = formatDateTime('2026-08-05T13:30:00.000Z', 'en');
    expect(out).toMatch(/Aug/);
    expect(out.length).toBeGreaterThan(formatDate('2026-08-05T13:30:00.000Z', 'en').length);
  });

  it('빈 값·잘못된 날짜는 빈 문자열', () => {
    expect(formatDateTime(null, 'ko')).toBe('');
    expect(formatDateTime('nope', 'en')).toBe('');
  });
});

describe('formatBytes', () => {
  it('1MB 이상은 MB, 미만은 KB', () => {
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0MB');
    expect(formatBytes(500 * 1024)).toBe('500KB');
  });

  it('값이 없으면 빈 문자열', () => {
    expect(formatBytes(null)).toBe('');
    expect(formatBytes(0)).toBe('');
  });
});
