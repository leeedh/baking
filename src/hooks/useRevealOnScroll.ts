'use client';

import { useEffect, useRef } from 'react';

/**
 * 뷰포트에 들어온 자손 [data-reveal-init] 요소를 떠오르게 한다(전이는 globals.css).
 *
 * **감춤 상태는 JS가 붙인다.** 마크업이 처음부터 opacity:0으로 렌더되면 JS가 실패한
 * 브라우저에서 카탈로그 자체가 보이지 않는다. 그래서 SSR 결과는 항상 보이는 상태이고,
 * 이 훅이 마운트된 뒤에만 data-reveal="out" → "in" 전이를 만든다.
 *
 * GSAP ScrollTrigger를 쓰지 않는 이유: MeringueHero의 cleanup이
 * `ScrollTrigger.getAll().forEach(kill)`로 전역 kill을 하므로, 히어로가 언마운트되면
 * 다른 섹션의 트리거까지 함께 죽는다. 리빌은 IntersectionObserver로 독립시킨다.
 *
 * 한 번 나타난 요소는 다시 감추지 않는다(스크롤을 되돌릴 때 깜빡이지 않도록).
 */
export function useRevealOnScroll<T extends HTMLElement = HTMLDivElement>(
  /** true면 자손을 찾지 않고 ref 요소 자신을 리빌한다. */
  self = false,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    // 아직 리빌 상태가 정해지지 않은 요소만 고른다(이미 "in"이 된 것은 건드리지 않는다).
    const collect = () => {
      const nodes = self
        ? [root]
        : Array.from(root.querySelectorAll<HTMLElement>('[data-reveal-init]'));
      return nodes.filter((el) => el.dataset.reveal !== 'in');
    };

    // 모션 감소 선호 시에는 관찰도 감춤도 하지 않는다 — 그대로 보이는 상태로 둔다.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = 'in';
          observer.unobserve(entry.target);
        }
      },
      // 요소가 화면 아래 12% 지점에 닿을 때 시작 — 스크롤 도착 전에 이미 자연스럽게 떠 있다.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    );

    const arm = () => {
      const targets = collect();
      if (targets.length === 0) return;
      for (const el of targets) {
        if (el.dataset.reveal === undefined) el.dataset.reveal = 'out';
        observer.observe(el);
      }
    };
    arm();

    // 필터·검색으로 목록이 다시 렌더되면 새 카드가 생긴다. 관찰을 붙이지 않으면
    // "out" 상태로 영구히 감춰지므로 DOM 변화를 따라간다.
    // (data-reveal 변경은 속성 변경이라 이 옵저버를 재귀 호출하지 않는다.)
    const mutations = self ? null : new MutationObserver(arm);
    mutations?.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations?.disconnect();
    };
  }, [self]);

  return ref;
}
