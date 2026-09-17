'use client';

import { Link, useRouter } from '@/i18n/navigation';
import { buttonClasses } from '@/lib/button-classes';
import { tossFailureAction, tossFailureKind } from '@/lib/payments/toss-failure';
import { CircleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';

/**
 * Toss failUrl 랜딩 — 결제창 단계에서 실패/취소된 경우(code, message 쿼리 전달).
 *
 * DC-33 · 사유(kind)별 안내와 다음 행동을 보여준다. 쿼리의 `message`는 쓰지 않는다 —
 * Toss 원문은 한국어 고정이고, 무엇보다 URL을 조작하면 임의 문구를 우리 화면에 띄울 수 있다.
 */
export function CheckoutFailScreen() {
  const t = useTranslations('checkout');
  const te = useTranslations('errors');
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const kind = tossFailureKind(code);
  const action = tossFailureAction(kind);

  const retry = () => router.push(`/checkout/${params.id}`);

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4 bg-cream">
      <div
        role="alert"
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-brown-light p-10 text-center space-y-5"
      >
        <CircleAlert size={44} className="mx-auto text-red-500" aria-hidden />
        <h1 className="font-serif text-xl font-bold text-brown">{t('failTitle')}</h1>
        <p className="text-sm text-red-700">
          {te(`toss.${kind}`)}
          {code && (
            <span className="block mt-1 text-[11px] text-brown-medium font-mono">
              {t('errorCode', { code })}
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {action === 'contact' ? (
            <Link href="/inquiries" className={buttonClasses('secondary')}>
              {t('ctaContact')}
            </Link>
          ) : (
            <button type="button" onClick={retry} className={buttonClasses('secondary')}>
              {action === 'otherMethod' ? t('ctaOtherMethod') : t('ctaRetry')}
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push(`/classes/${params.id}`)}
            className={buttonClasses('outline')}
          >
            {t('ctaBackToClass')}
          </button>
        </div>
      </div>
    </div>
  );
}
