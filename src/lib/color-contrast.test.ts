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
   * `gold`(= gold-deep보다 밝은 쪽)는 본문 텍스트로 쓰면 AA를 넘지 못한다.
   * 이 단언은 "밝은 gold는 텍스트가 아니다"라는 규약을 코드로 못박는 것이다 —
   * 만약 gold가 AA를 넘도록 어두워지면 gold/gold-deep을 나눌 이유가 사라지므로
   * 그때는 이 테스트와 토큰 구조를 함께 재검토해야 한다.
   */
  it('밝은 gold는 본문 텍스트로 쓸 수 없다 (장식·배경 전용)', () => {
    expect(contrastRatio(token('gold'), token('cream'))).toBeLessThan(AA_NORMAL_TEXT);
  });
});

describe('비텍스트 대비 (WCAG AA 3:1)', () => {
  it('포커스 링이 배경과 구분된다', () => {
    expect(contrastRatio(token('ring'), token('cream'))).toBeGreaterThanOrEqual(AA_NON_TEXT);
    expect(contrastRatio(token('ring'), token('ivory'))).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });
});
