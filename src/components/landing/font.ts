import { Bodoni_Moda } from 'next/font/google';

/**
 * 랜딩 후보 전용 디스플레이 서체.
 *
 * **이 호출을 페이지로 되돌리지 말 것** — 같은 Google 폰트를 두 파일에서 각각
 * 호출하면 Turbopack(`pnpm dev`)이 폰트 import map 치환에 실패해
 * `next/font/google queries have exactly one entry`로 빌드가 깨진다.
 * webpack 빌드(`pnpm build`)는 통과하므로 dev에서만 드러난다.
 * `/landing`과 `/landing2`가 이 모듈 하나를 공유한다.
 */
export const landingDisplayFont = Bodoni_Moda({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-landing-display',
  display: 'swap',
});
