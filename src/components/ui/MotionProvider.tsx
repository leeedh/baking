'use client';

import { LazyMotion } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * Motion의 기능 번들을 하이드레이션 **이후**에 가져오게 한다.
 *
 * 왜 필요한가 — `ToastProvider`가 `[locale]/layout.tsx`에 마운트돼 있어, `Modal`·`Toast`가
 * `motion.div`를 쓰는 순간 Motion이 레이아웃 청크 그룹에 들어가 **모든 페이지가 받아 갔다**
 * (실측 42.6kB gzip). 빌드 표의 페이지별 "First Load JS" 열은 레이아웃 자체 클라이언트
 * 청크를 세지 않아 적용 전후 수치가 똑같이 찍혔다 — 표가 아니라
 * `.next/app-build-manifest.json`의 청크 그룹으로 확인해야 한다.
 *
 * 그래서 호출부는 `motion/react`의 `motion.*`이 아니라 **`motion/react-m`의 `m.*`**를 쓴다.
 * `m`은 기능이 빠진 껍데기이고, 실제 애니메이션·제스처·projection 코드는 아래 `features`의
 * 동적 import로 최초 페인트 경로 밖에서 들어온다.
 *
 * 기능 번들을 `./motion-features`로 한 겹 감싼 이유는 그 파일 주석에 있다(트리셰이킹).
 *
 * `strict`는 호출부가 실수로 `motion.*`을 쓰면 던지게 한다 — 그 한 줄이 조용히 전체 번들을
 * 다시 끌어오기 때문이다.
 */
const loadFeatures = () => import('./motion-features').then((mod) => mod.default);

export default function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}
