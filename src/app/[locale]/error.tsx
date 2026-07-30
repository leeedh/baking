'use client';

import Button from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { buttonClasses } from '@/lib/button-classes';
import { RefreshCcw, TriangleAlert } from 'lucide-react';
import { useEffect } from 'react';

/**
 * 로케일 세그먼트 전체의 에러 경계. 이전에는 error.tsx가 하나도 없어
 * 서버 컴포넌트에서 throw가 나면 Next 기본 에러 화면이 그대로 노출됐다.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 서버 로그로는 이미 남지만, 클라이언트에서 발생한 경우를 위해 콘솔에도 남긴다.
    console.error('[locale error boundary]', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-20">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-full bg-terracotta/10 text-terracotta flex items-center justify-center">
          <TriangleAlert size={26} />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-brown break-keep">
          화면을 불러오지 못했습니다
        </h1>
        <p className="text-xs sm:text-sm text-brown-medium font-light leading-relaxed break-keep">
          일시적인 문제일 수 있습니다. 다시 시도해 보시고, 계속 같은 화면이 보이면 문의사항으로
          알려주세요.
        </p>
        {error.digest && (
          <p className="text-[11px] font-mono text-brown-medium/70">오류 코드: {error.digest}</p>
        )}

        <div className="flex flex-col sm:flex-row justify-center gap-2 pt-2">
          <Button onClick={reset}>
            <RefreshCcw size={13} />
            다시 시도
          </Button>
          <Link href="/" className={buttonClasses('outline')}>
            홈으로
          </Link>
          <Link href="/inquiries" className={buttonClasses('ghost')}>
            문의하기
          </Link>
        </div>
      </div>
    </div>
  );
}
