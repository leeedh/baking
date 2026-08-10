import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AA_NON_TEXT,
  AA_NORMAL_TEXT,
  contrastRatio,
  parseColorTokens,
  parseHex,
  relativeLuminance,
} from './color-contrast';

const tokens = parseColorTokens(
  readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf-8'),
);

/** 토큰명으로 hex를 꺼낸다 — 이름이 사라지면 조용히 통과하지 않도록 던진다. */
function token(name: string): string {
  const hex = tokens[name];
  if (!hex) throw new Error(`globals.css에 --color-${name}이 없습니다.`);
  return hex;
}

describe('대비율 계산', () => {
  it('축약 hex와 전체 hex를 같게 읽는다', () => {
    expect(parseHex('#fff')).toEqual(parseHex('#ffffff'));
  });

  it('형식이 어긋나면 던진다', () => {
    expect(() => parseHex('rgb(0,0,0)')).toThrow();
    expect(() => parseHex('#12345')).toThrow();
  });

  it('흑백 상대 휘도는 0과 1이다', () => {
    expect(relativeLuminance(parseHex('#000000'))).toBeCloseTo(0, 5);
    expect(relativeLuminance(parseHex('#ffffff'))).toBeCloseTo(1, 5);
  });

  it('흑백 대비는 21:1이고 같은 색은 1:1이다', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 2);
    expect(contrastRatio('#b0863c', '#b0863c')).toBeCloseTo(1, 5);
  });

  it('인자 순서를 바꿔도 같다', () => {
    expect(contrastRatio('#2a211b', '#faf4ea')).toBeCloseTo(
      contrastRatio('#faf4ea', '#2a211b'),
      10,
    );
  });
});

describe('globals.css 토큰 파싱', () => {
  it('코어 팔레트를 읽어 온다', () => {
    expect(tokens.cream).toBeDefined();
    expect(tokens['gold-deep']).toBeDefined();
    expect(tokens['terracotta-deep']).toBeDefined();
  });
});

/**
 * DC-56 — 브랜드 텍스트 색이 WCAG AA를 넘는지 잠근다.
 *
 * 이 표가 게이트의 본체다. 토큰을 밝게 바꾸면 여기서 즉시 빨간불이 난다.
 * 배경은 실제로 텍스트가 얹히는 세 가지(cream·ivory·white)만 본다.
 */
const TEXT_ON_BACKGROUNDS: Array<[fg: string, bg: string]> = [
  ['brown', 'cream'],
  ['brown', 'ivory'],
  ['brown-medium', 'cream'],
  ['brown-medium', 'ivory'],
  ['brown-deep', 'cream'],
  ['terracotta-deep', 'cream'],
  ['gold-deep', 'cream'],
  ['gold-deep', 'ivory'],
];

describe('브랜드 텍스트 대비 (WCAG AA 4.5:1)', () => {
  it.each(TEXT_ON_BACKGROUNDS)('%s on %s', (fg, bg) => {
    expect(contrastRatio(token(fg), token(bg))).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  /**
   * `gold`(= gold-deep보다 밝은 쪽)는 **밝은 배경의** 본문 텍스트로 쓰면 AA를 넘지 못한다.
   * 이 단언은 "밝은 면의 골드 텍스트는 gold-deep"이라는 규약을 코드로 못박는 것이다 —
   * 만약 gold가 AA를 넘도록 어두워지면 gold/gold-deep을 나눌 이유가 사라지므로
   * 그때는 이 테스트와 토큰 구조를 함께 재검토해야 한다.
   */
  it('밝은 gold는 밝은 배경의 본문 텍스트로 쓸 수 없다', () => {
    expect(contrastRatio(token('gold'), token('cream'))).toBeLessThan(AA_NORMAL_TEXT);
  });
});

/**
 * 어두운 면(`bg-brown` 패널·히어로)의 텍스트.
 *
 * 이 블록이 없어서 회귀가 났다 — 밝은 배경만 검사하던 게이트를 믿고 `text-gold`를
 * 일괄 `text-gold-deep`으로 바꾸다가, `RecommendationQuiz`의 `bg-brown` 컬럼에서
 * 대비가 4.75:1 → 3.07:1로 **떨어졌는데도 테스트가 통과**했다(Codex 리뷰 지적).
 * 골드는 배경 밝기에 따라 방향이 반대다: 밝은 면=gold-deep, 어두운 면=gold.
 */
const TEXT_ON_DARK_SURFACES: Array<[fg: string, bg: string]> = [
  ['gold', 'brown'],
  ['gold', 'hero-ink'],
  ['cream', 'brown'],
  ['cream', 'hero-ink'],
];

describe('어두운 면의 텍스트 대비 (WCAG AA 4.5:1)', () => {
  it.each(TEXT_ON_DARK_SURFACES)('%s on %s', (fg, bg) => {
    expect(contrastRatio(token(fg), token(bg))).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('gold-deep은 어두운 면의 텍스트로 쓸 수 없다 (밝은 면 전용)', () => {
    expect(contrastRatio(token('gold-deep'), token('brown'))).toBeLessThan(AA_NORMAL_TEXT);
  });
});

describe('비텍스트 대비 (WCAG AA 3:1)', () => {
  it('포커스 링이 배경과 구분된다', () => {
    expect(contrastRatio(token('ring'), token('cream'))).toBeGreaterThanOrEqual(AA_NON_TEXT);
    expect(contrastRatio(token('ring'), token('ivory'))).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });
});
