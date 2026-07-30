'use client';

import { type ButtonSize, type ButtonVariant, buttonClasses } from '@/lib/button-classes';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

// buttonClasses는 재수출하지 않는다 — 클라이언트 모듈을 경유하면 서버 컴포넌트에서
// 다시 "client function from the server" 오류가 난다. 호출부는 @/lib/button-classes에서 직접 가져올 것.

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 진행 중이면 스피너를 붙이고 disabled·aria-busy를 함께 건다. */
  loading?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {loading && <Loader2 size={size === 'sm' ? 12 : 14} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
