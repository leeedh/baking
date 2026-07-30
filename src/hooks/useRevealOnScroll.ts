'use client';

import { useEffect, useRef } from 'react';

/**
 * 뷰포트에 들어온 자손 [data-reveal] 요소를 "in"으로 전환한다(전이는 globals.css).
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

    const collect = () =>
      self ? [root] : Array.from(root.querySelectorAll<HTMLElement>('[data-reveal="out"]'));

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 모션 감소 선호 시에는 관찰 없이 즉시 표시한다(CSS도 이중으로 막지만 상태를 정리해 둔다).
    if (reduced) {
      for (const el of collect()) el.dataset.reveal = 'in';
      return;
    }

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

    const observeAll = () => {
      for (const el of collect()) observer.observe(el);
    };
    observeAll();

    // 필터·검색으로 목록이 다시 렌더되면 새 카드가 생긴다. 이때 관찰을 붙이지 않으면
    // data-reveal="out" 상태로 영구히 감춰지므로 DOM 변화를 따라간다.
    const mutations = self
      ? null
      : new MutationObserver(() => {
          observeAll();
        });
    mutations?.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations?.disconnect();
    };
  }, [self]);

  return ref;
}
