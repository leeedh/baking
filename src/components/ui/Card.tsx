import { cn } from '@/lib/cn';
import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 호버 시 살짝 떠오르는 카탈로그 카드용 모션. */
  interactive?: boolean;
  children: ReactNode;
}

/** 흰 표면 + brown-light 테두리 + shadow-card. 앱 전역의 카드·패널 셸. */
export default function Card({ interactive = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-card border border-brown-light shadow-card',
        interactive &&
          'transition-[box-shadow,transform] duration-300 ease-out-soft hover:shadow-card-hover hover:-translate-y-1',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
