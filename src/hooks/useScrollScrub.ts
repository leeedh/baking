'use client';

import { progressToTime, scrollProgress } from '@/lib/scrub/progress';
import { useEffect, useRef, useState } from 'react';

interface ScrollScrubOptions {
  /** 영상 길이(초). 메타데이터가 오기 전에도 계산을 시작하려고 미리 받는다. */
  duration: number;
  /** 원본 프레임레이트. 마지막 프레임을 남기는 계산에 쓰인다. */
  fps?: number;
  /**
   * 스크럽 감쇠 계수(0~1). 클수록 스크롤을 빠르게 따라오고, 작을수록 부드럽다.
   * 이게 없으면 휠 한 칸마다 영상이 툭툭 튄다.
   */
  smoothing?: number;
  /**
   * rAF 루프가 프레임당 한 번 호출한다. **여기서 React 상태를 쓰지 말 것** —
   * ref로 잡은 DOM에 직접 스타일을 써야 한다. 자세한 이유는 아래 주석 참조.
   */
  onFrame: (progress: number) => void;
}

interface ScrollScrubResult {
  /** 스크롤 예산을 만드는 바깥 트랙에 붙인다. */
  trackRef: React.RefObject<HTMLDivElement | null>;
  /** 스크럽 대상 <video>에 붙인다. */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** 스크럽이 실제로 동작 중인가. false면 정적 폴백을 그려야 한다. */
  active: boolean;
  /**
   * 모션 감소 설정이 켜져 있는가. 호출부가 `<video>` 자체를 포스터로 갈아끼우는 데 쓴다 —
   * CSS로 숨기기만 하면 브라우저는 영상을 그대로 내려받는다.
   */
  reduced: boolean;
}

/**
 * 이 시간 안에 첫 프레임이 디코딩되지 않으면 스크럽을 포기하고 정적 레이아웃으로 내려간다.
 * iOS 저전력 모드는 `play()`를 거부하고 `preload`를 강등해 `loadeddata`가 영영 오지 않는데,
 * 감지가 없으면 사용자는 포스터 정지화면을 보며 화면 세 장을 굴리게 된다.
 */
const LOAD_TIMEOUT_MS = 6000;

/**
 * 스크롤 진행률을 <video>의 재생 위치에 연결한다(스크롤 스크러빙).
 *
 * 설계상 지켜야 하는 것들:
 *
 * - **프레임마다 setState 하지 않는다.** 처음엔 진행률을 React 상태로 두고
 *   렌더에서 불투명도를 계산했는데, 프레임당 전체 트리 리렌더가 걸려
 *   rAF가 **초당 1프레임**까지 떨어졌다(실측). 그래서 진행률은 상태가 아니라
 *   `onFrame` 콜백으로 나가고, 호출부가 ref로 DOM에 직접 쓴다.
 *   React 상태는 한 번만 바뀌는 `active` 뿐이다.
 *
 * - **GSAP ScrollTrigger를 쓰지 않는다.** `MeringueHero.tsx`의 cleanup이
 *   `ScrollTrigger.getAll().forEach(kill)` — 전역 kill이라, 홈→랜딩 이동에서
 *   랜딩이 먼저 마운트되면 이 화면의 트리거까지 죽는다.
 *   `useRevealOnScroll.ts`가 GSAP을 피한 이유와 같다.
 *
 * - **scroll 핸들러는 목표값만 적는다.** 실제 `currentTime` 쓰기는 rAF 루프가
 *   프레임당 한 번만 수행한다. 스크롤 이벤트는 프레임보다 자주 온다.
 *
 * - **멈추면 루프도 멈춘다.** 목표에 수렴하면 rAF를 해제해 유휴 시 CPU를 쓰지 않는다.
 *
 * - **모션 감소를 존중한다.** reduce면 리스너조차 걸지 않고 정적 폴백에 맡긴다.
 */
export function useScrollScrub({
  duration,
  fps = 24,
  smoothing = 0.12,
  onFrame,
}: ScrollScrubOptions): ScrollScrubResult {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [active, setActive] = useState(false);
  const [reduced, setReduced] = useState(false);

  // 콜백이 매 렌더 새로 만들어져도 효과가 재실행되지 않게 ref로 흘려보낸다.
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    const track = trackRef.current;
    const video = videoRef.current;
    if (!track || !video) return;

    // 모션 감소: 스크럽·핀 연출을 통째로 포기하고 포스터 한 장으로 간다.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReduced(true);
      return;
    }

    setActive(true);

    let target = 0;
    let current = 0;
    let frame = 0;
    let visible = true;
    let ready = video.readyState >= 2;
    let timer = 0;

    const readTarget = () => {
      const rect = track.getBoundingClientRect();
      target = scrollProgress(rect.top, rect.height, window.innerHeight);
    };

    const apply = (progress: number) => {
      if (ready) {
        const next = progressToTime(progress, video.duration || duration, fps);
        // 같은 프레임을 다시 요청하면 불필요한 seek이 쌓인다.
        if (Math.abs(video.currentTime - next) > 1 / (fps * 2)) {
          video.currentTime = next;
        }
      }
      onFrameRef.current(progress);
    };

    const draw = () => {
      const delta = target - current;
      if (Math.abs(delta) < 0.0005) {
        current = target;
      } else {
        current += delta * smoothing;
      }
      apply(current);

      if (current !== target && visible) {
        frame = requestAnimationFrame(draw);
      } else {
        frame = 0;
      }
    };

    const kick = () => {
      readTarget();
      if (!frame && visible) frame = requestAnimationFrame(draw);
    };

    const onLoaded = () => {
      ready = true;
      if (timer) {
        clearTimeout(timer);
        timer = 0;
      }
      apply(current);
    };
    video.addEventListener('loadeddata', onLoaded);

    // iOS Safari는 사용자 제스처 전에 첫 프레임 디코딩을 미루는 경우가 있다.
    // 재생을 한 번 깨웠다가 즉시 멈춰 디코더를 준비시킨다. 실패해도 무시한다.
    video.play().then(
      () => video.pause(),
      () => undefined,
    );

    // 트랙이 화면 밖이면 루프 자체를 돌리지 않는다.
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) kick();
      },
      { rootMargin: '10% 0px' },
    );
    observer.observe(track);

    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick);

    const teardown = () => {
      window.removeEventListener('scroll', kick);
      window.removeEventListener('resize', kick);
      video.removeEventListener('loadeddata', onLoaded);
      observer.disconnect();
      visible = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (timer) {
        clearTimeout(timer);
        timer = 0;
      }
    };

    // 첫 프레임이 끝내 오지 않으면 정적 레이아웃으로 강등한다. 이때 rAF가 이미 써 둔
    // 인라인 불투명도가 카피를 숨긴 채로 남는데, `landing.css`의
    // `.landing-scrub:not([data-active])` 규칙이 그걸 되돌린다.
    if (!ready) {
      timer = window.setTimeout(() => {
        if (ready) return;
        teardown();
        setActive(false);
      }, LOAD_TIMEOUT_MS);
    }

    // 첫 프레임은 감쇠 없이 바로 맞춘다. 페이지 중간으로 바로 들어온 경우
    // (새로고침·앵커 이동) 0에서부터 굴러오면 엉뚱한 장면이 먼저 보인다.
    readTarget();
    current = target;
    apply(current);

    return teardown;
  }, [duration, fps, smoothing]);

  return { trackRef, videoRef, active, reduced };
}
