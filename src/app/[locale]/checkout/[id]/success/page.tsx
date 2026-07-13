'use client';

import { useRouter } from '@/i18n/navigation';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Phase = 'confirming' | 'done' | 'error';

/**
 * Toss successUrl 랜딩 — 결제창 인증 성공 후 서버 승인(TS-API-10)을 요청한다.
 * 승인·수강권 발급이 완료되어야 실제 구매 완료다.
 */
export default function CheckoutSuccessPage() {
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
      setErrorMsg('결제 승인 정보가 올바르지 않습니다.');
      return;
    }

    (async () => {
      const res = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentKey, orderId, amount }),
      });
      const body = await res.json();
      if (!res.ok) {
        setPhase('error');
        setErrorMsg(body.detail ?? body.title ?? '결제 승인에 실패했습니다.');
        return;
      }
      if (body.pending) {
        setPhase('error');
        setErrorMsg('입금 대기 중인 결제입니다. 입금 완료 시 수강권이 자동 발급됩니다.');
        return;
      }
      setPhase('done');
      setTimeout(() => {
        router.push('/my-classes');
        router.refresh();
      }, 1500);
    })().catch(() => {
      setPhase('error');
      setErrorMsg('결제 승인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    });
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4 bg-[#FAF4EA]">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#EFE8DC] p-10 text-center space-y-5">
        {phase === 'confirming' && (
          <>
            <span className="mx-auto block w-10 h-10 border-4 border-t-transparent border-[#B65538] rounded-full animate-spin" />
            <h1 className="font-serif text-xl font-bold text-[#2A211B]">
              결제 승인 및 수강권 발급 중...
            </h1>
            <p className="text-xs text-[#5F4E43]">
              서버에서 결제 금액을 검증하고 있습니다. 잠시만 기다려주세요.
            </p>
          </>
        )}
        {phase === 'done' && (
          <>
            <CheckCircle2 size={44} className="mx-auto text-emerald-600" />
            <h1 className="font-serif text-xl font-bold text-[#2A211B]">
              평생 소장권이 발급되었습니다!
            </h1>
            <p className="text-xs text-[#5F4E43]">내 클래스 보관함으로 이동합니다...</p>
          </>
        )}
        {phase === 'error' && (
          <>
            <CircleAlert size={44} className="mx-auto text-red-500" />
            <h1 className="font-serif text-xl font-bold text-[#2A211B]">
              결제를 완료하지 못했습니다
            </h1>
            <p className="text-xs text-red-600">{errorMsg}</p>
            <button
              type="button"
              onClick={() => router.push(`/checkout/${params.id}`)}
              className="px-6 py-2.5 bg-[#B65538] hover:bg-[#A14328] text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              결제 다시 시도
            </button>
          </>
        )}
      </div>
    </div>
  );
}
