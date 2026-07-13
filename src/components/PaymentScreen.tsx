'use client';

import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useClassById } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { type TossPaymentsWidgets, loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { AlertCircle, BadgePercent, ShoppingBag } from 'lucide-react';
import { useLocale } from 'next-intl';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface PaymentScreenProps {
  classId: string; // 카탈로그 slug (예: class-macarons)
}

interface DbCourse {
  id: string;
  price_krw: number;
  list_price_krw: number | null;
}

interface AppliedCoupon {
  code: string;
  discount_krw: number;
  final_krw: number;
}

// TS-ADR-05: 청구는 KRW 단일. EN(대만향) 로케일에는 지역 통화 참고가를 병기한다.
// 앱 레벨 근사 환율 — 비청구 표시 전용.
const KRW_PER_TWD = 41;

const COUPON_REASON_MESSAGES: Record<string, string> = {
  invalid_code: '유효하지 않은 쿠폰입니다.',
  not_started: '아직 사용 기간이 아닌 쿠폰입니다.',
  expired: '만료된 쿠폰입니다.',
  exhausted: '사용 한도가 소진된 쿠폰입니다.',
  course_not_found: '해당 클래스에 적용할 수 없습니다.',
};

export default function PaymentScreen({ classId }: PaymentScreenProps) {
  const cls = useClassById(classId);
  const router = useRouter();
  const locale = useLocale();
  const { user } = useAuth();
  const userEmail = user?.email ?? '';
  const supabase = useMemo(() => createClient(), []);

  const [dbCourse, setDbCourse] = useState<DbCourse | null>(null);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [payError, setPayError] = useState('');
  const [widgetReady, setWidgetReady] = useState(false);
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);

  const listPrice = dbCourse?.list_price_krw ?? cls.originalPrice;
  const price = dbCourse?.price_krw ?? cls.price;
  const finalPrice = coupon ? coupon.final_krw : price;

  // 1) 판매 코스 확정 (slug → DB UUID·서버 가격). 공개 read라 anon 키로 조회 가능.
  useEffect(() => {
    let active = true;
    supabase
      .from('courses')
      .select('id, price_krw, list_price_krw')
      .eq('slug', classId)
      .eq('status', 'published')
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          setPayError('판매 중인 클래스 정보를 불러오지 못했습니다.');
          return;
        }
        setDbCourse(data);
      });
    return () => {
      active = false;
    };
  }, [classId, supabase]);

  // 2) Toss 결제위젯 초기화 (로그인 사용자·코스 가격 확정 후 1회)
  useEffect(() => {
    if (!user || !dbCourse) return;
    let cancelled = false;
    (async () => {
      const toss = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY as string);
      const widgets = toss.widgets({ customerKey: user.id });
      await widgets.setAmount({ currency: 'KRW', value: dbCourse.price_krw });
      if (cancelled) return;
      await Promise.all([
        widgets.renderPaymentMethods({
          selector: '#toss-payment-methods',
          variantKey: 'DEFAULT',
        }),
        widgets.renderAgreement({ selector: '#toss-agreement', variantKey: 'AGREEMENT' }),
      ]);
      if (cancelled) return;
      widgetsRef.current = widgets;
      setWidgetReady(true);
    })().catch((e: Error) => {
      if (!cancelled) setPayError(`결제 모듈을 불러오지 못했습니다: ${e.message}`);
    });
    return () => {
      cancelled = true;
    };
  }, [user, dbCourse]);

  // 3) 쿠폰 적용 시 위젯 금액 동기화 (위젯이 늦게 준비돼도 최신 금액으로 맞춘다)
  // biome-ignore lint/correctness/useExhaustiveDependencies: widgetReady는 ref 준비 시점 재동기화 트리거
  useEffect(() => {
    widgetsRef.current?.setAmount({ currency: 'KRW', value: finalPrice });
  }, [finalPrice, widgetReady]);

  // 쿠폰 서버 검증 (validate_coupon RPC — 확정 단계와 동일 산출식)
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponMsg(null);
    if (!dbCourse || !couponCode.trim()) return;
    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code: couponCode,
      p_course_id: dbCourse.id,
    });
    const result = data as {
      valid: boolean;
      reason?: string;
      code?: string;
      discount_krw?: number;
      final_krw?: number;
    } | null;
    if (error || !result) {
      setCouponMsg({ ok: false, text: '쿠폰 확인에 실패했습니다. 잠시 후 다시 시도해주세요.' });
      return;
    }
    if (!result.valid) {
      setCoupon(null);
      setCouponMsg({
        ok: false,
        text: COUPON_REASON_MESSAGES[result.reason ?? ''] ?? '유효하지 않은 쿠폰입니다.',
      });
      return;
    }
    setCoupon({
      code: result.code ?? couponCode.toUpperCase(),
      discount_krw: result.discount_krw ?? 0,
      final_krw: result.final_krw ?? price,
    });
    setCouponMsg({
      ok: true,
      text: `쿠폰 할인 ₩${(result.discount_krw ?? 0).toLocaleString()}이 적용되었습니다.`,
    });
  };

  // 결제: 서버 주문 생성(금액 서버 산출) → Toss 결제창 → successUrl에서 서버 승인 검증
  const handlePay = async () => {
    setPayError('');
    if (!agreedTerms) {
      setPayError('구매 유의사항 및 평생 소장 동의 항목을 확인 및 체크해주세요.');
      return;
    }
    if (!widgetsRef.current || !dbCourse) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: dbCourse.id,
          couponCode: coupon?.code,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.detail ?? body.title ?? '주문 생성에 실패했습니다.');
      }

      // 서버 산출 금액을 위젯에 최종 반영 후 결제창 호출
      await widgetsRef.current.setAmount({ currency: 'KRW', value: body.amount });
      const phoneDigits = buyerPhone.replace(/\D/g, '');
      await widgetsRef.current.requestPayment({
        orderId: body.orderId,
        orderName: body.orderName,
        successUrl: `${window.location.origin}/${locale}/checkout/${classId}/success`,
        failUrl: `${window.location.origin}/${locale}/checkout/${classId}/fail`,
        customerEmail: userEmail || undefined,
        customerName: buyerName || undefined,
        ...(phoneDigits.length >= 10 && phoneDigits.length <= 11
          ? { customerMobilePhone: phoneDigits }
          : {}),
      });
      // requestPayment 성공 시 브라우저가 successUrl로 리다이렉트되므로 이후 코드는 실행되지 않음
    } catch (e) {
      // 사용자가 결제창을 닫은 경우 등
      setPayError((e as Error).message || '결제가 취소되었습니다.');
      setIsProcessing(false);
    }
  };

  return (
    <div id="payment-screen" className="bg-[#FAF4EA] py-12 px-4 sm:px-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-[#2A211B]">안심 안전 주문 결제</h1>
        <p className="text-xs text-[#5F4E43] mt-1">
          대만 및 국내 전용 신용카드, 간편결제 무중단 호환 · TossPayments 안전 결제
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Payment widget */}
        <div className="lg:col-span-7 space-y-6">
          {/* Orderer details card */}
          <div className="bg-white rounded-xl border border-[#EFE8DC] p-6 space-y-4">
            <h3 className="font-serif text-base font-bold text-[#2A211B] border-b border-[#FAF4EA] pb-3">
              1. 주문 수강생 정보
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#5F4E43] mb-1.5">
                  수강 아이디(이메일)
                </label>
                <input
                  type="text"
                  value={userEmail}
                  disabled
                  className="w-full px-3 py-2 bg-[#FAF4EA]/50 border border-[#EFE8DC] rounded-lg text-xs text-[#2A211B]/60 cursor-not-allowed font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5F4E43] mb-1.5">
                  이름 (실명)
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full px-3 py-2 bg-white border border-[#EFE8DC] rounded-lg text-xs text-[#2A211B] focus:outline-none focus:ring-1 focus:ring-[#B65538]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#5F4E43] mb-1.5">
                  연락처 (선택)
                </label>
                <input
                  type="text"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#EFE8DC] rounded-lg text-xs text-[#2A211B] focus:outline-none focus:ring-1 focus:ring-[#B65538] font-mono"
                  placeholder="010-XXXX-XXXX"
                />
                <span className="text-[10px] text-[#5F4E43]/60 mt-1 block">
                  결제 영수증 알림 수신에 사용됩니다.
                </span>
              </div>
            </div>
          </div>

          {/* TossPayments 결제수단 위젯 */}
          <div className="bg-white rounded-xl border border-[#EFE8DC] p-6 space-y-4">
            <h3 className="font-serif text-base font-bold text-[#2A211B] border-b border-[#FAF4EA] pb-3">
              2. 결제 수단 선택
            </h3>

            {!widgetReady && !payError && (
              <div className="flex items-center gap-2 text-xs text-[#5F4E43] py-8 justify-center">
                <span className="w-4 h-4 border-2 border-t-transparent border-[#B65538] rounded-full animate-spin" />
                결제 수단을 불러오는 중입니다...
              </div>
            )}
            <div id="toss-payment-methods" />
            <div id="toss-agreement" />

            <div className="bg-[#FAF4EA] p-3 rounded-lg border border-[#EFE8DC] space-y-1.5 text-xs text-[#5F4E43]">
              <span className="font-bold text-[#B0863C] block flex items-center gap-1">
                <AlertCircle size={14} /> 안전인증결제 가이드
              </span>
              <p>
                • 결제 금액은 서버에서 재검증되며, 승인 완료 즉시 평생 수강권이 발급됩니다. 해외
                카드(Visa/Master/JCB)는 3D Secure 국제안심인증이 적용될 수 있습니다.
              </p>
            </div>
          </div>

          {/* Coupon Entry */}
          <form
            onSubmit={handleApplyCoupon}
            className="bg-white rounded-xl border border-[#EFE8DC] p-6 space-y-3"
          >
            <h3 className="font-serif text-sm font-bold text-[#2A211B] flex items-center gap-1.5">
              <BadgePercent size={16} className="text-[#B0863C]" /> 할인가 혜택 입력
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="할인 쿠폰코드 (예시: BAKING10)"
                className="flex-1 px-3 py-2 bg-white border border-[#EFE8DC] rounded-lg text-xs text-[#2A211B] uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-[#B65538]"
              />
              <button
                type="submit"
                disabled={!dbCourse}
                className="px-4 py-2 bg-[#2A211B] text-white text-xs font-semibold rounded-lg hover:bg-[#B65538] transition-colors cursor-pointer disabled:opacity-50"
              >
                할인 적용
              </button>
            </div>
            {couponMsg && (
              <p
                className={`text-[11px] font-medium ${couponMsg.ok ? 'text-emerald-700' : 'text-red-600'}`}
              >
                {couponMsg.text}
              </p>
            )}
          </form>
        </div>

        {/* Right Column: Order breakdown & summary */}
        <div className="lg:col-span-5 sticky top-24">
          <div className="bg-white rounded-2xl border border-[#EFE8DC] p-6 shadow-md space-y-4">
            <h3 className="font-serif text-base font-bold text-[#2A211B] flex items-center gap-1.5 pb-2 border-b border-[#FAF4EA]">
              <ShoppingBag size={18} className="text-[#B65538]" /> 3. 최종 주문정보 요약
            </h3>

            {/* Miniature class summary info */}
            <div className="flex gap-3 bg-[#FAF4EA]/40 p-3 rounded-xl border border-[#EFE8DC]/80">
              <img
                referrerPolicy="no-referrer"
                src={cls.thumbnail}
                alt={cls.title}
                className="w-16 h-12 object-cover rounded-md"
              />
              <div>
                <span className="text-[9px] font-bold text-[#B0863C]">{cls.category}</span>
                <h4 className="text-xs font-bold text-[#2A211B] line-clamp-1">{cls.title}</h4>
                <div className="flex items-center gap-1.5 text-[10px] text-[#5F4E43] mt-1">
                  <span>강사: {cls.instructor}</span>
                  <span>•</span>
                  <span className="text-[#B65538] font-bold">평생 소장 VOD</span>
                </div>
              </div>
            </div>

            {/* Calculations pricing breakdown */}
            <div className="space-y-2.5 text-xs text-[#2A211B] py-2">
              <div className="flex justify-between items-center text-[#5F4E43]">
                <span>정상가 VOD 라이선스 수강권</span>
                <span>₩{listPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[#5F3E43]">
                <span>얼리버드 이벤트 자체 할인</span>
                <span className="text-[#B65538]">- ₩{(listPrice - price).toLocaleString()}</span>
              </div>

              {coupon && (
                <div className="flex justify-between items-center text-[#B0863C] font-semibold">
                  <span>추가 적용 쿠폰 ({coupon.code})</span>
                  <span>- ₩{coupon.discount_krw.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-[#5F4E43]">
                <span>자료 파일 수령 및 데이터 가입</span>
                <span className="text-emerald-700 font-bold">₩0 (무상제공)</span>
              </div>

              <div className="h-px bg-[#EFE8DC]" />

              <div className="flex justify-between items-baseline pt-2">
                <span className="font-bold text-[#2A211B]">최종 결제 금액 (원화)</span>
                <span className="text-xl font-serif font-extrabold text-[#B65538]">
                  ₩{finalPrice.toLocaleString()}
                </span>
              </div>
              {locale === 'en' && (
                <p className="text-right text-[10px] text-[#5F4E43]/70">
                  ≈ NT$ {Math.round(finalPrice / KRW_PER_TWD).toLocaleString()} (reference only —
                  billed in KRW)
                </p>
              )}
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-2 pt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={() => setAgreedTerms(!agreedTerms)}
                className="w-4 h-4 rounded text-[#B65538] border-[#EFE8DC] focus:ring-[#B65538] accent-[#B65538] mt-0.5"
              />
              <span className="text-[11px] text-[#5F4E43] leading-relaxed">
                [필수] 본 상품은 영구 소장 디지털 VOD이며, 시청 개시 후 디지털 복제 방지법에
                의거하여 단순 변심 환불이 제한됨을 동의합니다.
              </span>
            </label>

            {payError && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700">
                {payError}
              </div>
            )}

            {/* Large trigger pay button */}
            <button
              id="btn-process-payment"
              type="button"
              onClick={handlePay}
              disabled={isProcessing || !widgetReady}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-[#FAF4EA] text-center shadow transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isProcessing || !widgetReady
                  ? 'bg-[#B65538]/60 cursor-not-allowed'
                  : 'bg-[#B65538] hover:bg-[#A14328] hover:shadow-md'
              }`}
            >
              {isProcessing ? (
                <>
                  <span className="w-4 h-4 border-2 border-t-transparent border-[#FAF4EA] rounded-full animate-spin" />
                  결제창 호출 중...
                </>
              ) : (
                <>₩{finalPrice.toLocaleString()} 결제 및 바로 평생소장 수강하기</>
              )}
            </button>

            <button
              type="button"
              onClick={() => router.push(`/classes/${cls.id}`)}
              disabled={isProcessing}
              className="w-full text-center text-xs text-[#5F4E43]/80 hover:underline pt-2 font-medium cursor-pointer"
            >
              이전으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
