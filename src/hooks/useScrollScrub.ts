'use client';

import { progressToTime, scrollProgress } from '@/lib/scrub/progress';
import { useCallback, useEffect, useRef, useState } from 'react';

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

/**
 * 스크럽이 왜 그 상태인지 밖에서 읽을 수 있게 내보내는 값.
 *
 * 실기기(모바일)에서 스크럽이 조용히 정적 폴백으로 내려앉는 일이 있었는데, 원격
 * 디버깅이 불가능한 환경이라 원인을 좁힐 근거가 아무것도 남지 않았다. 그래서
 * 로딩 파이프라인의 판정 근거를 이 구조체에 남긴다. `?debug=scrub`일 때만 화면에
 * 뿌려지고(`LandingScrubHero.tsx`), 평소에는 아무도 읽지 않는다.
 */
export interface ScrubDiagnostics {
  phase: 'init' | 'loading' | 'ready' | 'degraded';
  /** 마지막으로 phase를 바꾼 사건. 사람이 읽는 값이다. */
  reason: string;
  readyState: number;
  networkState: number;
  /** 버퍼 끝(초). 0에서 움직이지 않으면 네트워크가 한 바이트도 오지 않았다는 뜻이다. */
  buffered: number;
  /** `play()`가 거부됐다면 그 DOMException 이름. null이면 거부된 적 없다. */
  playRejection: string | null;
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
  /**
   * 진단값을 읽는다. **상태가 아니라 함수다** — 이 값들은 로딩 중 수시로 바뀌는데
   * 상태로 올리면 프레임당 리렌더 금지 규약(아래)을 우회로 깨게 된다. 호출부가
   * 필요할 때만(디버그 배지에서 1초 간격으로) 폴링한다.
   */
  readDiagnostics: () => ScrubDiagnostics;
}

/**
 * 버퍼가 이만큼 늘지 않으면 로딩이 멈춘 것으로 본다.
 *
 * 예전에는 "6초 안에 `loadeddata`가 안 오면 강등"이라는 단일 데드라인이었는데,
 * 느린 셀룰러에서 **정상적으로 받는 중이던 영상까지** 잘라 버렸다. 지금은 버퍼가
 * 늘고 있으면 계속 기다리고, 증가가 멈췄을 때만 재시도 → 강등으로 간다.
 */
const LOAD_STALL_MS = 4000;

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
 *
 * - **로딩을 `play()`에 걸지 않는다.** `<video preload="none">`이라 브라우저는 자발적으로
 *   한 바이트도 받지 않는데, 예전에는 유일한 트리거가 `play()`였고 그 거부는 통째로
 *   삼켜졌다. 모바일 Chrome이 미디어 정책으로 `play()`를 거부하면 네트워크 요청 자체가
 *   없었고, 6초 뒤 아무 흔적 없이 정적으로 강등됐다. 지금은 `load()`가 로딩을 시작하고
 *   `play()`는 iOS 디코더 웜업 용도로만 곁들인다.
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

  const diagRef = useRef<ScrubDiagnostics>({
    phase: 'init',
    reason: 'mount',
    readyState: 0,
    networkState: 0,
    buffered: 0,
    playRejection: null,
  });
  const readDiagnostics = useCallback(() => diagRef.current, []);

  useEffect(() => {
    const track = trackRef.current;
    const video = videoRef.current;
    if (!track || !video) return;

    // 모션 감소: 스크럽·핀 연출을 통째로 포기하고 포스터 한 장으로 간다.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReduced(true);
      diagRef.current.reason = 'prefers-reduced-motion';
      return;
    }

    setActive(true);

    let target = 0;
    let current = 0;
    let frame = 0;
    let visible = true;
    let ready = video.readyState >= 2;
    let started = false;
    let retried = false;
    let lastBuffered = -1;
    let watchdog = 0;

    const bufferedEnd = () =>
      video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) : 0;

    const note = (phase: ScrubDiagnostics['phase'], reason: string) => {
      const d = diagRef.current;
      d.phase = phase;
      d.reason = reason;
      d.readyState = video.readyState;
      d.networkState = video.networkState;
      d.buffered = bufferedEnd();
    };

    /**
     * 스크롤 예산의 기준은 **핀 엘리먼트의 실측 높이**다.
     * `window.innerHeight`를 쓰면 안 된다 — 핀 높이는 `calc(100svh - inset)`인데
     * 모바일의 `innerHeight`는 주소창 상태에 따라 `svh`~`lvh` 사이에서 출렁여
     * 진행률이 1에 닿지 못하거나 일찍 포화된다(데스크톱에서도 inset만큼 어긋났다).
     */
    const pinHeight = () => {
      const pin = track.querySelector<HTMLElement>('.landing-scrub__pin');
      return pin?.getBoundingClientRect().height || window.innerHeight;
    };

    const readTarget = () => {
      const rect = track.getBoundingClientRect();
      target = scrollProgress(rect.top, rect.height, pinHeight());
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

    const stopWatchdog = () => {
      if (watchdog) {
        clearInterval(watchdog);
        watchdog = 0;
      }
    };

    const degrade = (reason: string) => {
      note('degraded', reason);
      teardown();
      setActive(false);
    };

    /** 버퍼가 늘고 있으면 기다리고, 멈췄으면 한 번 재시도한 뒤 강등한다. */
    const watch = () => {
      if (ready) {
        stopWatchdog();
        return;
      }
      const end = bufferedEnd();
      if (end > lastBuffered) {
        lastBuffered = end;
        note('loading', 'buffering');
        return;
      }
      if (!retried) {
        retried = true;
        note('loading', 'stalled, retry load()');
        video.load();
        return;
      }
      degrade('stalled');
    };

    const startLoad = () => {
      if (started || ready) return;
      started = true;
      lastBuffered = -1;
      note('loading', 'load()');
      video.load();

      // iOS Safari는 사용자 제스처 전에 첫 프레임 디코딩을 미루는 경우가 있다.
      // 재생을 한 번 깨웠다가 즉시 멈춰 디코더를 준비시킨다. **실패해도 로딩은
      // `load()`가 이미 시작했으므로 치명적이지 않다** — 다만 거부 사유는 남긴다.
      video.play().then(
        () => video.pause(),
        (err: unknown) => {
          diagRef.current.playRejection =
            err instanceof Error ? err.name : String(err ?? 'unknown');
        },
      );

      stopWatchdog();
      watchdog = window.setInterval(watch, LOAD_STALL_MS);
    };

    const onLoaded = () => {
      ready = true;
      stopWatchdog();
      note('ready', 'loadeddata');
      apply(current);
    };

    // 디코딩 자체가 실패하면 재시도해도 같은 결과다. 곧장 정적으로 내려간다.
    const onError = () => degrade(`media error ${video.error?.code ?? '?'}`);

    video.addEventListener('loadeddata', onLoaded);
    video.addEventListener('error', onError);

    /**
     * 트랙이 화면 밖이면 루프 자체를 돌리지 않는다. **로딩 시작점도 여기다** —
     * 마운트 즉시 받기 시작하면 셀룰러 사용자가 화면에 들어오기도 전에 7MB를 쓴다.
     */
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) {
          startLoad();
          kick();
        }
      },
      { rootMargin: '10% 0px' },
    );
    observer.observe(track);

    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick);
    // 모바일 주소창이 접히고 펼쳐질 때 `resize`가 항상 오지는 않는다. 핀 높이는
    // 그때 바뀌므로 visualViewport 쪽도 같이 들어야 진행률이 어긋나지 않는다.
    window.visualViewport?.addEventListener('resize', kick);

    // 함수 선언(`function teardown()`)으로 두지 말 것 — 호이스팅 때문에 TS가 위쪽의
    // `if (!video) return` 좁히기를 잃고 `video`를 null 가능으로 본다.
    const teardown = () => {
      window.removeEventListener('scroll', kick);
      window.removeEventListener('resize', kick);
      window.visualViewport?.removeEventListener('resize', kick);
      video.removeEventListener('loadeddata', onLoaded);
      video.removeEventListener('error', onError);
      observer.disconnect();
      visible = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      stopWatchdog();
    };

    // 첫 프레임은 감쇠 없이 바로 맞춘다. 페이지 중간으로 바로 들어온 경우
    // (새로고침·앵커 이동) 0에서부터 굴러오면 엉뚱한 장면이 먼저 보인다.
    readTarget();
    current = target;
    apply(current);

    return teardown;
  }, [duration, fps, smoothing]);

  return { trackRef, videoRef, active, reduced, readDiagnostics };
}
