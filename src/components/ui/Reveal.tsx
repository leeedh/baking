'use client';

import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import { cn } from '@/lib/cn';
import type { CSSProperties, ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  /** 스태거 지연(ms). 그리드 안의 카드에 index * 60 정도를 넣는다. */
  delay?: number;
  className?: string;
}

/**
 * 단일 요소 리빌. 여러 자식을 스태거로 띄울 때는 부모에서 useRevealOnScroll()을 직접 쓰고
 * 자식에 data-reveal="out"을 붙이는 편이 옵저버 하나로 끝난다.
 */
export default function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRevealOnScroll<HTMLDivElement>(true);
  return (
    <div
      ref={ref}
      data-reveal="out"
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
      className={cn(className)}
    >
      {children}
    </div>
  );
}
