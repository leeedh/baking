'use client';

import { useEffect } from 'react';
import './globals.css';

/**
 * 루트 레이아웃 자체가 실패했을 때의 최후 경계 — <html>/<body>를 직접 렌더해야 한다.
 * next-intl 메시지도 못 읽는 상황이라 문구는 한국어로 고정한다.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global error boundary]', error);
  }, [error]);

  return (
    <html lang="ko">
      <body className="bg-cream text-brown font-sans">
        <div className="min-h-screen flex items-center justify-center px-6 py-20">
          <div className="max-w-md w-full text-center space-y-5">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold break-keep">
              일시적인 오류가 발생했습니다
            </h1>
            <p className="text-xs sm:text-sm text-brown-medium font-light leading-relaxed break-keep">
              페이지를 새로고침해 주세요. 문제가 계속되면 support@ateliercreme.com으로 알려주세요.
            </p>
            {error.digest && (
              <p className="text-[11px] font-mono text-brown-medium/70">
                오류 코드: {error.digest}
              </p>
            )}
            {/* reset()은 같은 경로를 다시 렌더한다 — 일시적 실패면 이동 없이 복구된다(코드리뷰 M-11). */}
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-xl bg-brown text-white text-xs font-bold hover:bg-terracotta transition-colors cursor-pointer"
              >
                다시 시도
              </button>
              <a
                href="/"
                className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-xl border border-brown-light text-brown text-xs font-bold hover:bg-brown-light/40 transition-colors"
              >
                홈으로
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
