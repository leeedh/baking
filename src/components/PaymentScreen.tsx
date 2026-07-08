'use client';

import { useRouter } from '@/i18n/navigation';
import { useAppStore, useClassById } from '@/lib/store';
import {
  AlertCircle,
  BadgePercent,
  Check,
  CreditCard,
  Globe,
  Landmark,
  ShoppingBag,
  Wallet,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

interface PaymentScreenProps {
  classId: string;
}

type PaymentMethod = 'korean-card' | 'overseas-card' | 'simple-pay' | 'line-pay';

export default function PaymentScreen({ classId }: PaymentScreenProps) {
  const cls = useClassById(classId);
  const router = useRouter();
  const userEmail = useAppStore((s) => s.userEmail);
  const addPurchased = useAppStore((s) => s.addPurchased);

  const onPaymentSuccess = (id: string) => {
    addPurchased(id);
    router.push('/my-classes');
    alert(
      '🎉 정식 평생소장 라이선스 계약이 완료되었습니다! 내 클래스 보관함에서 평생 기한 없이 반복 수강하실 수 있습니다.',
    );
  };
  const onNavigateBack = () => router.push(`/classes/${cls.id}`);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('korean-card');
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [buyerName, setBuyerName] = useState('김베이커');
  const [buyerPhone, setBuyerPhone] = useState('010-1234-5678');
  const [agreedTerms, setAgreedTerms] = useState(true);

  // Apply a dynamic discount code
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponCode.toUpperCase() === 'BAKING10') {
      setAppliedDiscount(15000);
      alert('쿠폰 할인 ₩15,000이 적용되었습니다!');
    } else {
      alert('유효하지 않은 쿠폰입니다. (힌트: BAKING10 입력 시 15,000원 즉시 할인)');
    }
  };

  const finalPrice = Math.max(0, cls.price - appliedDiscount);

  const handlePay = () => {
    if (!agreedTerms) {
      alert('구매 유의사항 및 평생 소장 동의 항목을 확인 및 체크해주세요.');
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onPaymentSuccess(cls.id);
    }, 1500); // 1.5s simulated elegant terminal gateway process
  };

  return (
    <div id="payment-screen" className="bg-[#FAF4EA] py-12 px-4 sm:px-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-[#2A211B]">안심 안전 주문 결제</h1>
        <p className="text-xs text-[#5F4E43] mt-1">
          대만 및 국내 전용 신용카드, 라인페이, 간편결제 무중단 호환
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Payment Method Selectors */}
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
                  className="w-full px-3 py-2 bg-white border border-[#EFE8DC] rounded-lg text-xs text-[#2A211B] focus:outline-none focus:ring-1 focus:ring-[#B65538]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#5F4E43] mb-1.5">
                  연락처 (인증번호 대용)
                </label>
                <input
                  type="text"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#EFE8DC] rounded-lg text-xs text-[#2A211B] focus:outline-none focus:ring-1 focus:ring-[#B65538] font-mono"
                  placeholder="010-XXXX-XXXX"
                />
                <span className="text-[10px] text-[#5F4E43]/60 mt-1 block">
                  수강 변경 이력 및 영수증 번호와 동기화됩니다.
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method selectors */}
          <div className="bg-white rounded-xl border border-[#EFE8DC] p-6 space-y-4">
            <h3 className="font-serif text-base font-bold text-[#2A211B] border-b border-[#FAF4EA] pb-3">
              2. 결제 수단 선택
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Korean Card */}
              <button
                id="pm-korean-card"
                type="button"
                onClick={() => setPaymentMethod('korean-card')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between h-24 transition-all cursor-pointer ${
                  paymentMethod === 'korean-card'
                    ? 'border-[#B65538] bg-[#B65538]/5 text-[#B65538]'
                    : 'border-[#EFE8DC] bg-white text-[#5F4E43] hover:bg-[#FAF4EA]/40'
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <CreditCard size={18} />
                  {paymentMethod === 'korean-card' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#B65538] shrink-0" />
                  )}
                </div>
                <div>
                  <span className="block text-xs font-bold font-sans">국내 신용카드</span>
                  <span className="text-[10px] opacity-70">일시불/할부 전용</span>
                </div>
              </button>

              {/* Option 2: Taiwan/Overseas Card */}
              <button
                id="pm-overseas-card"
                type="button"
                onClick={() => setPaymentMethod('overseas-card')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between h-24 transition-all cursor-pointer ${
                  paymentMethod === 'overseas-card'
                    ? 'border-[#B65538] bg-[#B65538]/5 text-[#B65538]'
                    : 'border-[#EFE8DC] bg-white text-[#5F4E43] hover:bg-[#FAF4EA]/40'
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <Globe size={18} className="text-[#B0863C]" />
                  {paymentMethod === 'overseas-card' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#B65538] shrink-0" />
                  )}
                </div>
                <div>
                  <span className="block text-xs font-bold font-sans">
                    해외 결제 (Visa/Master/JCB)
                  </span>
                  <span className="text-[10px] opacity-70">대만(台灣) 포함 통합 지원</span>
                </div>
              </button>

              {/* Option 3: Kakao/Toss Simple Pay */}
              <button
                id="pm-simple-pay"
                type="button"
                onClick={() => setPaymentMethod('simple-pay')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between h-24 transition-all cursor-pointer ${
                  paymentMethod === 'simple-pay'
                    ? 'border-[#B65538] bg-[#B65538]/5 text-[#B65538]'
                    : 'border-[#EFE8DC] bg-white text-[#5F4E43] hover:bg-[#FAF4EA]/40'
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <Wallet size={18} />
                  {paymentMethod === 'simple-pay' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#B65538] shrink-0" />
                  )}
                </div>
                <div>
                  <span className="block text-xs font-bold font-sans">카카오페이 / 토스페이</span>
                  <span className="text-[10px] opacity-70">모바일 앱 터치 즉시 결제</span>
                </div>
              </button>

              {/* Option 4: Line Pay / Apple Pay */}
              <button
                id="pm-line-pay"
                type="button"
                onClick={() => setPaymentMethod('line-pay')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between h-24 transition-all cursor-pointer ${
                  paymentMethod === 'line-pay'
                    ? 'border-[#B65538] bg-[#B65538]/5 text-[#B65538]'
                    : 'border-[#EFE8DC] bg-white text-[#5F4E43] hover:bg-[#FAF4EA]/40'
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <span className="text-[10px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded">
                    LINE PY
                  </span>
                  {paymentMethod === 'line-pay' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#B65538] shrink-0" />
                  )}
                </div>
                <div>
                  <span className="block text-xs font-bold font-sans">Line Pay & Apple Pay</span>
                  <span className="text-[10px] opacity-70">대만 달러(TWD) 가맹 대응</span>
                </div>
              </button>
            </div>

            {/* Simulated Payment instruction prompt */}
            <div className="bg-[#FAF4EA] p-3 rounded-lg border border-[#EFE8DC] space-y-1.5 text-xs text-[#5F4E43]">
              <span className="font-bold text-[#B0863C] block flex items-center gap-1">
                <AlertCircle size={14} /> 안전인증결제 가이드
              </span>
              {paymentMethod === 'korean-card' && (
                <p>
                  • 국내 신용카드 수강 시 앱카드 간편인증 및 ISP 비밀번호 입력창이 다음에
                  노출됩니다.
                </p>
              )}
              {paymentMethod === 'overseas-card' && (
                <p>
                  • 3D Secure 2.0 국제안심인증이 적용되며 승인 전용 OTP 코드가 수취될 수 있습니다.
                </p>
              )}
              {paymentMethod === 'simple-pay' && (
                <p>• 네이버/카카오 연계 생체 인식 완료 시 수강 승인이 실시간 자동 승인됩니다.</p>
              )}
              {paymentMethod === 'line-pay' && (
                <p>• LINE Pay 대만 지부 연동에 의한 환율 계산 청구가 실행됩니다.</p>
              )}
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
                className="px-4 py-2 bg-[#2A211B] text-white text-xs font-semibold rounded-lg hover:bg-[#B65538] transition-colors cursor-pointer"
              >
                할인 적용
              </button>
            </div>
            <p className="text-[10px] text-[#5F4E43]/60 italic font-mono">
              * 힌트: BAKING10 입력 후 적용 시 ₩15,000 즉시 할인!
            </p>
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
                <span>₩{cls.originalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[#5F3E43]">
                <span>얼리버드 이벤트 자체 할인</span>
                <span className="text-[#B65538]">
                  - ₩{(cls.originalPrice - cls.price).toLocaleString()}
                </span>
              </div>

              {appliedDiscount > 0 && (
                <div className="flex justify-between items-center text-[#B0863C] font-semibold">
                  <span>추가 적용 쿠폰 할인 코드</span>
                  <span>- ₩{appliedDiscount.toLocaleString()}</span>
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

            {/* Large trigger pay button */}
            <button
              id="btn-process-payment"
              onClick={handlePay}
              disabled={isProcessing}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-[#FAF4EA] text-center shadow transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isProcessing
                  ? 'bg-[#B65538]/60 cursor-not-allowed'
                  : 'bg-[#B65538] hover:bg-[#A14328] hover:shadow-md'
              }`}
            >
              {isProcessing ? (
                <>
                  <span className="w-4 h-4 border-2 border-t-transparent border-[#FAF4EA] rounded-full animate-spin" />
                  해외 승인 및 수강 인가 처리 중...
                </>
              ) : (
                <>₩{finalPrice.toLocaleString()} 결제 및 바로 평생소장 수강하기</>
              )}
            </button>

            <button
              type="button"
              onClick={onNavigateBack}
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
