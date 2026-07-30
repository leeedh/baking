'use client';

import { cn } from '@/lib/cn';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useId } from 'react';

const CONTROL =
  'w-full bg-white text-brown placeholder:text-brown-medium/50 border border-brown-light rounded-xl ' +
  'transition-[border-color,box-shadow] duration-200 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const SIZES = 'text-xs px-3.5 py-2.5 min-h-[44px]';

/** 라벨·힌트·에러를 묶는 공통 래퍼. id 연결은 여기서 강제된다. */
function FieldShell({
  id,
  label,
  hint,
  error,
  hideLabel,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={id}
        className={cn(
          'block text-[11px] font-bold text-brown-medium',
          hideLabel && 'sr-only',
        )}
      >
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-[11px] text-brown-medium/80 font-light">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-[11px] text-terracotta-deep font-semibold">
          {error}
        </p>
      )}
    </div>
  );
}

type SharedFieldProps = {
  /** 필수. 시각적으로 숨기려면 hideLabel을 쓴다 — 라벨 자체를 빼지 말 것. */
  label: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
  wrapperClassName?: string;
};

export function Input({
  label,
  hint,
  error,
  hideLabel,
  wrapperClassName,
  className,
  id: idProp,
  ...rest
}: SharedFieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      hideLabel={hideLabel}
      className={wrapperClassName}
    >
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(CONTROL, SIZES, error && 'border-terracotta', className)}
        {...rest}
      />
    </FieldShell>
  );
}

export function Textarea({
  label,
  hint,
  error,
  hideLabel,
  wrapperClassName,
  className,
  id: idProp,
  rows = 4,
  ...rest
}: SharedFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      hideLabel={hideLabel}
      className={wrapperClassName}
    >
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(CONTROL, 'text-xs px-3.5 py-2.5 leading-relaxed', error && 'border-terracotta', className)}
        {...rest}
      />
    </FieldShell>
  );
}

export function Select({
  label,
  hint,
  error,
  hideLabel,
  wrapperClassName,
  className,
  id: idProp,
  children,
  ...rest
}: SharedFieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      hideLabel={hideLabel}
      className={wrapperClassName}
    >
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(CONTROL, SIZES, 'cursor-pointer', className)}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
}
