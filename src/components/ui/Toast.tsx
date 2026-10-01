'use client';

import { cn } from '@/lib/cn';
import { X } from 'lucide-react';
import { AnimatePresence, useReducedMotion } from 'motion/react';
// `motion/react-m`은 요소별 named export(`div`·`button`…)라 네임스페이스로 받는다.
// 기능이 빠진 껍데기 컴포넌트이고, 실제 엔진은 `MotionProvider`가 동적으로 불러온다.
import * as m from 'motion/react-m';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useRef, useState } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastInput {
  tone?: ToastTone;
  message: string;
}

const ToastContext = createContext<((input: ToastInput) => void) | null>(null);

/** 자동 소멸까지의 시간. hover·focus 중에는 타이머를 걸지 않는다. */
const DISMISS_MS = 5000;

/**
 * 브라우저 alert() 대체 — 흐름을 끊지 않으면서 스크린리더에도 전달되는 안내.
 *
 * 라이브 리전을 톤별로 둘로 나눈 이유: 하나의 리전에 성공과 오류를 같이 넣으면
 * 뒤에 들어온 안내가 앞의 것을 덮어써 오류를 놓친다. 오류만 assertive로 즉시
 * 끊어 읽고 나머지는 polite로 대기시킨다.
 *
 * 마운트 위치는 `[locale]/layout.tsx` — 클라이언트 내비게이션을 넘어 살아남아야
 * 한다(DetailScreen이 안내를 띄운 직후 /login으로 이동하기 때문).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const schedule = useCallback(
    (id: number) => {
      if (timers.current.has(id)) return;
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DISMISS_MS),
      );
    },
    [dismiss],
  );

  const pause = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (!timer) return;
    clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const toast = useCallback(
    ({ tone = 'info', message }: ToastInput) => {
      seq.current += 1;
      const id = seq.current;
      setItems((prev) => [...prev, { id, tone, message }]);
      schedule(id);
    },
    [schedule],
  );

  const errors = items.filter((item) => item.tone === 'error');
  const others = items.filter((item) => item.tone !== 'error');

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[min(22rem,calc(100vw-2rem))] pointer-events-none">
        <ToastRegion
          items={errors}
          role="alert"
          onDismiss={dismiss}
          onPause={pause}
          onResume={schedule}
        />
        <ToastRegion
          items={others}
          role="status"
          onDismiss={dismiss}
          onPause={pause}
          onResume={schedule}
        />
      </div>
    </ToastContext.Provider>
  );
}

const TONE: Record<ToastTone, string> = {
  // 인라인 오류 박스(DashboardScreen)와 같은 토큰을 쓴다 — 오류 표현을 한 벌로 유지.
  error: 'border-terracotta/30 bg-terracotta/10 text-terracotta-deep',
  // Badge의 success 톤과 동일 — 성공 표현도 한 벌로 유지.
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  info: 'border-brown-light bg-white text-brown',
};

function ToastRegion({
  items,
  role,
  onDismiss,
  onPause,
  onResume,
}: {
  items: ToastItem[];
  role: 'alert' | 'status';
  onDismiss: (id: number) => void;
  onPause: (id: number) => void;
  onResume: (id: number) => void;
}) {
  const t = useTranslations();

  /**
   * `globals.css`의 전역 `prefers-reduced-motion` 블록은 CSS만 덮는다 — Motion이 JS로 돌리는
   * 애니메이션은 여기서 직접 꺼야 한다(`Modal.tsx`와 같은 규약).
   */
  const reduced = useReducedMotion();
  const transition = reduced
    ? { duration: 0 }
    : ({ type: 'spring', bounce: 0.25, visualDuration: 0.3 } as const);

  return (
    // 라이브 리전은 **이 바깥 래퍼에 그대로 둔다.** 톤별로 둘로 나눈 구조(파일 상단 주석)를
    // 깨면 성공 안내가 오류를 덮는다. 애니메이션은 리전 안쪽 항목에만 건다.
    <div
      role={role}
      aria-live={role === 'alert' ? 'assertive' : 'polite'}
      className="flex flex-col gap-2"
    >
      {/*
        `mode="popLayout"`이 사라지는 항목을 레이아웃 흐름에서 즉시 빼내고, 남은 항목이
        `layout`으로 그 자리를 메운다. 예전에는 배열에서 바로 filter로 제거해, 위쪽 토스트를
        닫으면 아래 것이 한 프레임에 **점프**했다.
      */}
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map((item) => (
          <m.div
            key={item.id}
            layout
            // 스택이 화면 **하단**에 붙어 있으므로 아래에서 올라온다. 예전 클래스
            // `animate-slide-in-from-top`은 위에서 내려와 방향이 거꾸로였다.
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={transition}
            onMouseEnter={() => onPause(item.id)}
            onMouseLeave={() => onResume(item.id)}
            onFocus={() => onPause(item.id)}
            onBlur={() => onResume(item.id)}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-panel',
              'text-xs font-semibold break-keep',
              TONE[item.tone],
            )}
          >
            <span className="flex-1">{item.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              aria-label={t('common.close')}
              className="shrink-0 -m-1 p-1 rounded opacity-60 hover:opacity-100 transition-opacity cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X size={14} aria-hidden />
            </button>
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * 안내 하나를 띄운다. ToastProvider 밖에서 부르면 던진다 —
 * 조용히 무시하면 alert()를 걷어낸 자리에서 안내가 사라진 걸 눈치채지 못한다.
 *
 * 예외 문구가 영어인 것은 개발자 대상이기 때문이다(사용자에게 노출되지 않는다).
 * 이 파일은 messages.test.ts의 하드코딩 한글 스캐너 대상이기도 하다.
 */
export function useToast(): (input: ToastInput) => void {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider.');
  return ctx;
}
