'use client';

import { cn } from '@/lib/cn';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useId, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * 실제로 포커스를 받을 수 있는 노드만 남긴다.
 * `querySelectorAll`은 `display:none`인 요소도 걸러 주지 않아서, 조건부로 숨긴 버튼이
 * 트랩의 first/last로 잡히면 Tab이 보이지 않는 곳으로 빠진다.
 */
function focusableNodes(panel: HTMLElement | null): HTMLElement[] {
  if (!panel) return [];
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** 본문이 없는 확인 다이얼로그도 있으므로 선택값이다. */
  children?: ReactNode;
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
  const t = useTranslations();
  const panelRef = useRef<HTMLDivElement>(null);
  /** 열기 직전에 포커스를 갖고 있던 요소 — 닫을 때 여기로 되돌린다. */
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  /**
   * onClose를 ref로 우회하는 이유 — 이 값을 effect 의존성에 넣으면 안 된다.
   * 호출부는 전부 `onClose={() => setX(false)}` 인라인 화살표를 넘기므로 부모가 리렌더될
   * 때마다 아이덴티티가 바뀐다. 그러면 아래 effect가 cleanup→재실행되면서
   * cleanup의 restoreRef.focus()가 포커스를 배경으로 빼앗고 재실행이 첫 필드로 되돌려,
   * 폼 모달에서 **한 글자 칠 때마다 포커스가 튀어** 입력이 불가능했다.
   */
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCloseRef.current();
      return;
    }
    if (e.key !== 'Tab') return;

    // 포커스 트랩 — 패널 안에서만 순환한다.
    const nodes = focusableNodes(panelRef.current);
    if (nodes.length === 0) return;
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
  }, []);

  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement as HTMLElement | null;

    // 배경 스크롤 락
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // 첫 인터랙티브 요소(없으면 패널 자체)로 초기 포커스
    const nodes = focusableNodes(panelRef.current);
    (nodes.length > 0 ? nodes[0] : panelRef.current)?.focus();

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
            aria-label={t('common.close')}
            className="shrink-0 p-2 -m-1 rounded-lg text-brown-medium hover:text-terracotta hover:bg-terracotta/5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <X size={16} />
          </button>
        </div>

        {children && <div className="px-6 py-5 space-y-4">{children}</div>}

        {footer && (
          <div
            className={cn(
              'px-6 pb-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2',
              // 본문이 없으면 헤더 구분선과 버튼이 붙어 보여 여백을 더 준다.
              children ? 'pt-2' : 'pt-5',
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
