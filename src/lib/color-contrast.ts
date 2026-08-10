/**
 * WCAG 2.1 대비율 계산 — 순수 함수라 콜로케이트 테스트로 잠근다(DC-56).
 *
 * 브랜드 토큰이 실제로 AA를 넘는지 눈으로 판정할 수 없어서 계산으로 옮겼다.
 * 토큰 값은 테스트가 globals.css에서 직접 읽으므로 CSS와 어긋날 수 없다.
 */

/** WCAG AA — 본문 텍스트. */
export const AA_NORMAL_TEXT = 4.5;
/** WCAG AA — 굵은 18.66px 이상 또는 24px 이상의 큰 텍스트. */
export const AA_LARGE_TEXT = 3;
/** WCAG AA — UI 컴포넌트·그래픽 경계. */
export const AA_NON_TEXT = 3;

export type Rgb = { r: number; g: number; b: number };

/** `#rgb` · `#rrggbb`를 0~255 채널로. 형식이 어긋나면 던진다(조용한 0 반환은 게이트를 무력화한다). */
export function parseHex(hex: string): Rgb {
  const raw = hex.trim().replace(/^#/, '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`hex 색상으로 파싱할 수 없습니다: ${hex}`);
  }
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

/** sRGB 상대 휘도 (WCAG 정의). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** 두 색의 대비율(1~21). 인자 순서는 무관하다. */
export function contrastRatio(fg: string, bg: string): number {
  const a = relativeLuminance(parseHex(fg));
  const b = relativeLuminance(parseHex(bg));
  const [light, dark] = a >= b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

/** `--color-*: #hex;` 선언만 뽑아 토큰명 → hex 맵으로. */
export function parseColorTokens(css: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  const re = /--color-([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g;
  let m: RegExpExecArray | null = re.exec(css);
  while (m !== null) {
    tokens[m[1]] = m[2];
    m = re.exec(css);
  }
  return tokens;
}
