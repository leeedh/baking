'use client';

import { cn } from '@/lib/cn';
import { X } from 'lucide-react';
import { AnimatePresence, useIsPresent, useReducedMotion } from 'motion/react';
// `motion/react-m`은 요소별 named export(`div`·`button`…)라 네임스페이스로 받는다.
// 기능이 빠진 껍데기 컴포넌트이고, 실제 엔진은 `MotionProvider`가 동적으로 불러온다.
import * as m from 'motion/react-m';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useId, useRef } from 'react';

/** `--ease-out-soft`(globals.css)와 같은 곡선. 브랜드 모션을 CSS와 한 벌로 유지한다. */
const EASE_OUT_SOFT = [0.22, 1, 0.36, 1] as const;

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
   * **`globals.css`의 전역 `prefers-reduced-motion` 블록은 이 애니메이션을 막지 못한다** —
   * 그 블록은 CSS `animation`/`transition`의 duration만 0으로 눌러서, Motion이 JS로 돌리는
   * 애니메이션에는 아무 영향이 없다. 그래서 여기서 직접 분기해 전이를 없앤다.
   * (`MotionConfig`를 레이아웃에 두지 않은 이유 — `[locale]/layout.tsx`는 서버 컴포넌트라
   *  클라이언트 래퍼를 새로 만들어야 하고, 분기가 필요한 곳은 이 파일과 `Toast.tsx`뿐이다.)
   */
  const reduced = useReducedMotion();
  const backdropTransition = { duration: reduced ? 0 : 0.18, ease: EASE_OUT_SOFT };
  // 결제·운영자 콘솔이 걸린 화면이라 오버슈트는 최소로 둔다(bounce 0.2).
  const panelTransition = reduced
    ? { duration: 0 }
    : ({ type: 'spring', bounce: 0.2, visualDuration: 0.25 } as const);

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

  /**
   * **`if (!open) return null`로 두지 말 것** — 그러면 닫힘이 한 프레임에 끝나 등장만
   * 애니메이션되는 비대칭이 된다. React의 조건부 언마운트는 CSS로 지연시킬 수 없어
   * `AnimatePresence`가 퇴장 동안 트리를 붙잡아 준다.
   *
   * 포커스 복원은 **퇴장을 기다리지 않는다**(위 effect의 cleanup이 즉시 돌린다) —
   * 애니메이션 끝까지 기다리면 키보드 사용자에게 포커스가 늦게 돌아와 더 나쁘다.
   *
   * 그래서 퇴장 구간에는 **`inert`가 필요하다.** ESC·Tab 리스너는 `open`이 false가 되는
   * 즉시 해제되지만, 그건 포커스 **트랩**을 없애는 것일 뿐 포커스가 아직 DOM에 남아 있는
   * 패널로 들어가는 것을 막지 못한다. 복원된 트리거에서 바로 Tab을 누르면 사라지는 중인
   * 패널의 버튼으로 들어갈 수 있었다. 그 판정을 `ModalSurface`가 맡는다 — 이유는 그쪽
   * 주석 참조.
   */
  return (
    <AnimatePresence>
      {open && (
        <ModalSurface
          panelRef={panelRef}
          onClose={onClose}
          title={title}
          description={description}
          titleId={titleId}
          descId={descId}
          closeLabel={t('common.close')}
          backdropTransition={backdropTransition}
          panelTransition={panelTransition}
          footer={footer}
          className={className}
        >
          {children}
        </ModalSurface>
      )}
    </AnimatePresence>
  );
}

interface ModalSurfaceProps {
  panelRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  title: string;
  description?: string;
  titleId: string;
  descId: string;
  closeLabel: string;
  backdropTransition: object;
  panelTransition: object;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * 백드롭과 패널. **`Modal`에서 분리돼 있어야 한다** — `useIsPresent()`는
 * `AnimatePresence`가 자식에게 내려 주는 컨텍스트를 읽으므로, `AnimatePresence`를
 * **렌더하는** `Modal` 본문에서는 호출할 수 없다(항상 true가 된다).
 *
 * 왜 `open`이 아니라 `useIsPresent()`인가 — `inert={!open}`으로 짰다가 Codex 리뷰에서
 * 무효임이 드러났다. `{open && ...}`는 닫힐 때 자식을 트리에서 빼고 `AnimatePresence`가
 * **`open === true`였던 마지막 렌더 결과를 그대로 붙잡아** 퇴장을 돌린다. 그래서 보존된
 * 엘리먼트의 `inert`는 퇴장 내내 false였고, 닫은 직후 Tab·클릭이 사라지는 중인 패널에
 * 그대로 닿았다. `useIsPresent()`는 그 보존된 엘리먼트 자신이 퇴장 중인지를 알려준다.
 *
 * `inert`는 포인터 이벤트도 함께 죽이므로 퇴장 중 백드롭 클릭이 `onClose`를 다시 때리는
 * 것도 같이 막힌다. 패널이 아니라 **백드롭**에 거는 이유는 조상이라 패널까지 한 번에 덮고
 * 자신의 `onClick`도 함께 비활성되기 때문이다.
 */
function ModalSurface({
  panelRef,
  onClose,
  title,
  description,
  titleId,
  descId,
  closeLabel,
  backdropTransition,
  panelTransition,
  children,
  footer,
  className,
}: ModalSurfaceProps) {
  const isPresent = useIsPresent();

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={backdropTransition}
      inert={!isPresent}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brown/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <m.div
        ref={panelRef}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={panelTransition}
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
          'focus-visible:outline-none',
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
            aria-label={closeLabel}
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
      </m.div>
    </m.div>
  );
}
