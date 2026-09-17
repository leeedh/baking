'use client';

import { useProblemMessage } from '@/hooks/useProblemMessage';
import { useRouter } from '@/i18n/navigation';
import { buttonClasses } from '@/lib/button-classes';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Phase = 'confirming' | 'done' | 'error';

/**
 * Toss successUrl 랜딩 — 결제창 인증 성공 후 서버 승인(TS-API-10)을 요청한다.
 * 승인·수강권 발급이 완료되어야 실제 구매 완료다.
 */
export function CheckoutSuccessScreen() {
  const t = useTranslations('checkout');
  const te = useTranslations('errors');
  const describeProblem = useProblemMessage();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>('confirming');
  const [errorMsg, setErrorMsg] = useState('');
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return; // StrictMode 이중 실행 방지 (confirm은 서버 멱등이지만 불필요 호출 차단)
    requested.current = true;

    const paymentKey = searchParams.get('paymentKey');
    const orderId = searchParams.get('orderId');
    const amount = Number(searchParams.get('amount'));
    if (!paymentKey || !orderId || !Number.isFinite(amount)) {
      setPhase('error');
      setErrorMsg(t('errInvalidParams'));
      return;
    }

    (async () => {
      const res = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentKey, orderId, amount }),
      });
      if (!res.ok) {
        setPhase('error');
        setErrorMsg(await describeProblem(res, te('toss.unknown')));
        return;
      }
      const body = await res.json();
      if (body.pending) {
        setPhase('error');
        setErrorMsg(t('errPending'));
        return;
      }
      setPhase('done');
      setTimeout(() => {
        router.push('/my-classes');
        router.refresh();
      }, 1500);
    })().catch(() => {
      setPhase('error');
      setErrorMsg(te('network'));
    });
  }, [searchParams, router, t, te, describeProblem]);

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4 bg-cream">
      <div
        aria-live="polite"
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-brown-light p-10 text-center space-y-5"
      >
        {phase === 'confirming' && (
          <>
            <span
              className="mx-auto block w-10 h-10 border-4 border-t-transparent border-terracotta rounded-full animate-spin"
              data-motion-essential
              aria-hidden
            />
            <h1 className="font-serif text-xl font-bold text-brown">{t('confirmingTitle')}</h1>
            <p className="text-xs text-brown-medium">{t('confirmingBody')}</p>
          </>
        )}
        {phase === 'done' && (
          <>
            <CheckCircle2 size={44} className="mx-auto text-emerald-600" aria-hidden />
            <h1 className="font-serif text-xl font-bold text-brown">{t('doneTitle')}</h1>
            <p className="text-xs text-brown-medium">{t('doneBody')}</p>
          </>
        )}
        {phase === 'error' && (
          <>
            <CircleAlert size={44} className="mx-auto text-red-500" aria-hidden />
            <h1 className="font-serif text-xl font-bold text-brown">{t('errorTitle')}</h1>
            <p className="text-sm text-red-700" role="alert">
              {errorMsg}
            </p>
            <button
              type="button"
              onClick={() => router.push(`/checkout/${params.id}`)}
              className={buttonClasses('secondary')}
            >
              {t('ctaRetry')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
