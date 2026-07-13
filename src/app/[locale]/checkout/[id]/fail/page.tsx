'use client';

import { useRouter } from '@/i18n/navigation';
import { CircleAlert } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';

/** Toss failUrl 랜딩 — 결제창 단계에서 실패/취소된 경우(code, message 쿼리 전달). */
export default function CheckoutFailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const message = searchParams.get('message');

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4 bg-[#FAF4EA]">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#EFE8DC] p-10 text-center space-y-5">
        <CircleAlert size={44} className="mx-auto text-red-500" />
        <h1 className="font-serif text-xl font-bold text-[#2A211B]">결제에 실패했습니다</h1>
        <p className="text-xs text-red-600">
          {message ?? '결제가 취소되었거나 승인되지 않았습니다.'}
          {code && (
            <span className="block mt-1 text-[10px] text-[#5F4E43]/60 font-mono">({code})</span>
          )}
        </p>
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={() => router.push(`/checkout/${params.id}`)}
            className="px-6 py-2.5 bg-[#B65538] hover:bg-[#A14328] text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            결제 다시 시도
          </button>
          <button
            type="button"
            onClick={() => router.push(`/classes/${params.id}`)}
            className="px-6 py-2.5 bg-white border border-[#EFE8DC] text-[#5F4E43] text-xs font-semibold rounded-xl cursor-pointer"
          >
            클래스로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
