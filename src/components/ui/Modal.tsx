'use client';

import { cn } from '@/lib/cn';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useId, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** 하단 액션 영역(주로 취소 + 확인 버튼). */
  footer?: ReactNode;
  className?: string;
}

/**
 * 접근 가능한 모달. 이전에는 DashboardScreen이 `fixed inset-0` div를 직접 그려
 * role="dialog"·포커스 트랩·ESC·포커스 복원이 전부 없었다.
 * 네이티브 <dialog>를 쓰지 않은 이유: 기존 백드롭 스타일(backdrop-blur)을 그대로 유지하기 위함.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  /** 열기 직전에 포커스를 갖고 있던 요소 — 닫을 때 여기로 되돌린다. */
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      // 포커스 트랩 — 패널 안에서만 순환한다.
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement as HTMLElement | null;

    // 배경 스크롤 락
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // 첫 인터랙티브 요소(없으면 패널 자체)로 초기 포커스
    const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    (nodes && nodes.length > 0 ? nodes[0] : panelRef.current)?.focus();

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      restoreRef.current?.focus();
    };
  }, [open, onKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brown/55 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        // biome-ignore lint/a11y/useSemanticElements: 네이티브 <dialog>는 백드롭 blur 스타일을 유지할 수 없어 의도적으로 쓰지 않는다(파일 상단 주석 참고)
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        // 백드롭 클릭만 닫히도록 패널 내부 클릭은 전파를 끊는다.
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-panel border border-brown-light shadow-panel',
          'animate-rise focus-visible:outline-none',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-brown-light">
          <div className="space-y-1">
            <h2 id={titleId} className="font-serif text-lg font-bold text-brown break-keep">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-xs text-brown-medium font-light break-keep">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 p-2 -m-1 rounded-lg text-brown-medium hover:text-terracotta hover:bg-terracotta/5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">{children}</div>

        {footer && (
          <div className="px-6 pb-6 pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
