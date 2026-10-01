/**
 * `MotionProvider`가 동적 import 하는 Motion 기능 번들.
 *
 * **왜 파일을 따로 두는가** — `import('motion/react').then((mod) => mod.domMax)`로 쓰면
 * webpack이 네임스페이스 전체를 살려 둬 비동기 청크가 51.2kB(gzip)까지 불었다(실측).
 * `domMax`만 재수출하는 모듈을 경유하면 쓰지 않는 `motion` 컴포넌트·제스처 엔트리가
 * 트리셰이킹으로 떨어진다.
 *
 * `domMax`인 이유는 `Toast`의 스택 재배치가 `layout` 애니메이션(projection 엔진)이라서다.
 * `domAnimation`으로 낮추면 토스트가 닫힐 때 아래 항목이 다시 점프한다.
 */
export { domMax as default } from 'motion/react';
