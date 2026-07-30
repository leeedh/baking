import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  // 에스프레소 → 테라코타. 앱 전역의 기본 CTA.
  primary: 'bg-brown text-white hover:bg-terracotta shadow-card',
  secondary: 'bg-terracotta text-white hover:bg-terracotta-deep shadow-card',
  outline:
    'bg-white text-brown border border-brown-light hover:border-terracotta hover:text-terracotta',
  ghost: 'bg-transparent text-brown-medium hover:text-terracotta hover:bg-terracotta/5',
  danger: 'bg-white text-terracotta-deep border border-terracotta/30 hover:bg-terracotta/10',
};

// 44px 최소 터치 타깃: md/lg는 충족, sm은 조밀한 테이블 액션 전용이라 예외.
const SIZE: Record<ButtonSize, string> = {
  sm: 'text-[11px] px-3 py-1.5 rounded-lg gap-1 min-h-[32px]',
  md: 'text-xs px-5 py-2.5 rounded-xl gap-1.5 min-h-[44px]',
  lg: 'text-sm px-7 py-3.5 rounded-xl gap-2 min-h-[48px]',
};

const BASE =
  'inline-flex items-center justify-center font-bold whitespace-nowrap cursor-pointer ' +
  'transition-[background-color,color,border-color,box-shadow,transform] duration-300 ease-out-soft ' +
  'active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/**
 * `<Link>`처럼 button이 아닌 요소에 같은 외형을 입힐 때 쓴다.
 *
 * 이 함수는 **`'use client'` 없는 모듈**에 있어야 한다 — not-found.tsx·NewsletterCTA 같은
 * 서버 컴포넌트가 직접 호출하기 때문이다(클라이언트 모듈의 함수는 서버에서 호출할 수 없다).
 */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(BASE, VARIANT[variant], SIZE[size], className);
}
