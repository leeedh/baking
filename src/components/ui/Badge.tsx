import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'gold' | 'terracotta' | 'success' | 'muted';

const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-cream text-brown-medium border-brown-light',
  gold: 'bg-gold/10 text-gold-deep border-gold/20',
  terracotta: 'bg-terracotta/10 text-terracotta-deep border-terracotta/20',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  muted: 'bg-brown/5 text-brown-medium border-brown-light',
};

interface BadgeProps {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}

/** 상태·라벨 필. 폰트 최소 11px(이전 10px는 저대비에서 판독이 어려웠다). */
export default function Badge({ tone = 'neutral', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
