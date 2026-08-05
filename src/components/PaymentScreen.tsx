'use client';

import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatCount, formatKrw } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import { getSupabasePublicEnv } from '@/lib/supabase/env';
import type { ClassItem } from '@/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { type TossPaymentsWidgets, loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { AlertCircle, BadgePercent, ShoppingBag } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Database } from '../../supabase/database.types';

interface PaymentScreenProps {
  classId: string; // 카탈로그 slug (예: class-macarons)
  /** 서버가 course_catalog에서 조회한 코스 메타(제목·썸네일·가격). 표시 전용. */
  course: ClassItem;
  /** courses.id (UUID) — 쿠폰 검증·주문 생성에 사용. */
  courseId: string;
}

interface AppliedCoupon {
  code: string;
  discount_krw: number;
  final_krw: number;
}

// TS-ADR-05: 청구는 KRW 단일. EN(대만향) 로케일에는 지역 통화 참고가를 병기한다.
// 앱 레벨 근사 환율 — 비청구 표시 전용.
const KRW_PER_TWD = 41;

/** validate_coupon RPC가 돌려주는 사유 코드 — 메시지는 payment.couponReason.* 에 있다. */
const COUPON_REASONS = [
  'invalid_code',
  'not_started',
  'expired',
  'exhausted',
  'course_not_found',
] as const;

export default function PaymentScreen({ classId, course, courseId }: PaymentScreenProps) {
  const router = useRouter();
  const locale = useLocale() as 'ko' | 'en';
  const t = useTranslations('payment');
  const { user } = useAuth();
  const userEmail = user?.email ?? '';
  const supabase = useMemo<SupabaseClient<Database> | null>(() => {
    if (!getSupabasePublicEnv()) return null;
    return createClient();
  }, []);

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

  // 가격은 서버가 course_catalog에서 조회한 값(표시 전용). 청구 금액은 create-order가
  // courses.price_krw로 다시 산출하고 confirm이 order.amount_krw와 대조한다.
  const listPrice = course.originalPrice;
  const price = course.price;
  const eventDiscount = Math.max(listPrice - price, 0);
  const finalPrice = coupon ? coupon.final_krw : price;

  // Supabase 공개 env 부재는 쿠폰 검증(RPC) 불가로 이어지므로 미리 알린다.
  useEffect(() => {
    if (!supabase) {
      setPayError(t('errSupabaseEnv'));
    }
  }, [supabase, t]);

  // Toss 결제위젯 초기화 (로그인 사용자 확인 후 1회)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) {
        throw new Error(t('errTossKey'));
      }
      const toss = await loadTossPayments(clientKey);
      const widgets = toss.widgets({ customerKey: user.id });
      await widgets.setAmount({ currency: 'KRW', value: price });
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
      if (!cancelled) setPayError(t('errWidgetLoad', { message: e.message }));
    });
    return () => {
      cancelled = true;
    };
  }, [user, price, t]);

  // 쿠폰 적용 시 위젯 금액 동기화 (위젯이 늦게 준비돼도 최신 금액으로 맞춘다)
  // biome-ignore lint/correctness/useExhaustiveDependencies: widgetReady는 ref 준비 시점 재동기화 트리거
  useEffect(() => {
    widgetsRef.current?.setAmount({ currency: 'KRW', value: finalPrice });
  }, [finalPrice, widgetReady]);

  // 쿠폰 서버 검증 (validate_coupon RPC — 확정 단계와 동일 산출식)
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponMsg(null);
    if (!supabase || !couponCode.trim()) return;
    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code: couponCode,
      p_course_id: courseId,
    });
    const result = data as {
      valid: boolean;
      reason?: string;
      code?: string;
      discount_krw?: number;
      final_krw?: number;
    } | null;
    if (error || !result) {
      setCouponMsg({ ok: false, text: t('couponCheckFailed') });
      return;
    }
    if (!result.valid) {
      setCoupon(null);
      const reason = COUPON_REASONS.find((r) => r === result.reason) ?? 'invalid_code';
      setCouponMsg({ ok: false, text: t(`couponReason.${reason}`) });
      return;
    }
    setCoupon({
      code: result.code ?? couponCode.toUpperCase(),
      discount_krw: result.discount_krw ?? 0,
      final_krw: result.final_krw ?? price,
    });
    setCouponMsg({
      ok: true,
      text: t('couponApplied', { amount: formatKrw(result.discount_krw ?? 0, locale) }),
    });
  };

  // 결제: 서버 주문 생성(금액 서버 산출) → Toss 결제창 → successUrl에서 서버 승인 검증
  const handlePay = async () => {
    setPayError('');
    if (!agreedTerms) {
      setPayError(t('errAgreeRequired'));
      return;
    }
    if (!widgetsRef.current) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          couponCode: coupon?.code,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.detail ?? body.title ?? t('errOrderCreate'));
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
      setPayError((e as Error).message || t('errPayCanceled'));
      setIsProcessing(false);
    }
  };

  return (
    <div id="payment-screen" className="bg-cream py-12 px-4 sm:px-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-brown">{t('title')}</h1>
        <p className="text-xs text-brown-medium mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Payment widget */}
        <div className="lg:col-span-7 space-y-6">
          {/* Orderer details card */}
          <div className="bg-white rounded-xl border border-brown-light p-6 space-y-4">
            <h3 className="font-serif text-base font-bold text-brown border-b border-cream pb-3">
              {t('section1')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-brown-medium mb-1.5">
                  {t('emailLabel')}
                </label>
                <input
                  type="text"
                  value={userEmail}
                  disabled
                  className="w-full px-3 py-2 bg-cream/50 border border-brown-light rounded-lg text-xs text-brown/60 cursor-not-allowed font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brown-medium mb-1.5">
                  {t('nameLabel')}
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder={t('namePlaceholder')}
                  className="w-full px-3 py-2 bg-white border border-brown-light rounded-lg text-xs text-brown focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-brown-medium mb-1.5">
                  {t('phoneLabel')}
                </label>
                <input
                  type="text"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-brown-light rounded-lg text-xs text-brown focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring font-mono"
                  placeholder="010-XXXX-XXXX"
                />
                <span className="text-[10px] text-brown-medium/60 mt-1 block">
                  {t('phoneHint')}
                </span>
              </div>
            </div>
          </div>

          {/* TossPayments 결제수단 위젯 */}
          <div className="bg-white rounded-xl border border-brown-light p-6 space-y-4">
            <h3 className="font-serif text-base font-bold text-brown border-b border-cream pb-3">
              {t('section2')}
            </h3>

            {!widgetReady && !payError && (
              <div className="flex items-center gap-2 text-xs text-brown-medium py-8 justify-center">
                <span className="w-4 h-4 border-2 border-t-transparent border-terracotta rounded-full animate-spin" />
                {t('loadingMethods')}
              </div>
            )}
            <div id="toss-payment-methods" />
            <div id="toss-agreement" />

            <div className="bg-cream p-3 rounded-lg border border-brown-light space-y-1.5 text-xs text-brown-medium">
              <span className="font-bold text-gold block flex items-center gap-1">
                <AlertCircle size={14} /> {t('guideTitle')}
              </span>
              <p>{t('guideBody')}</p>
            </div>
          </div>

          {/* Coupon Entry */}
          <form
            onSubmit={handleApplyCoupon}
            className="bg-white rounded-xl border border-brown-light p-6 space-y-3"
          >
            <h3 className="font-serif text-sm font-bold text-brown flex items-center gap-1.5">
              <BadgePercent size={16} className="text-gold" /> {t('couponTitle')}
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder={t('couponPlaceholder')}
                className="flex-1 px-3 py-2 bg-white border border-brown-light rounded-lg text-xs text-brown uppercase tracking-wider focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-brown text-white text-xs font-semibold rounded-lg hover:bg-terracotta transition-colors cursor-pointer disabled:opacity-50"
              >
                {t('couponApply')}
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
          <div className="bg-white rounded-2xl border border-brown-light p-6 shadow-md space-y-4">
            <h3 className="font-serif text-base font-bold text-brown flex items-center gap-1.5 pb-2 border-b border-cream">
              <ShoppingBag size={18} className="text-terracotta" /> {t('section3')}
            </h3>

            {/* Miniature class summary info */}
            <div className="flex gap-3 bg-cream/40 p-3 rounded-xl border border-brown-light/80">
              <img
                referrerPolicy="no-referrer"
                src={course.thumbnail}
                alt={course.title}
                className="w-16 h-12 object-cover rounded-md"
              />
              <div>
                <span className="text-[9px] font-bold text-gold">{course.category}</span>
                <h4 className="text-xs font-bold text-brown line-clamp-1">{course.title}</h4>
                <div className="flex items-center gap-1.5 text-[10px] text-brown-medium mt-1">
                  <span>{t('instructorLabel', { name: course.instructor })}</span>
                  <span>•</span>
                  <span className="text-terracotta font-bold">{t('lifetimeVod')}</span>
                </div>
              </div>
            </div>

            {/* Calculations pricing breakdown */}
            <div className="space-y-2.5 text-xs text-brown py-2">
              <div className="flex justify-between items-center text-brown-medium">
                <span>{t('rowList')}</span>
                <span>{formatKrw(listPrice, locale)}</span>
              </div>
              {eventDiscount > 0 && (
                <div className="flex justify-between items-center text-brown-medium">
                  <span>{t('rowEventDiscount')}</span>
                  <span className="text-terracotta">- {formatKrw(eventDiscount, locale)}</span>
                </div>
              )}

              {coupon && (
                <div className="flex justify-between items-center text-gold font-semibold">
                  <span>{t('rowCoupon', { code: coupon.code })}</span>
                  <span>- {formatKrw(coupon.discount_krw, locale)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-brown-medium">
                <span>{t('rowMaterials')}</span>
                <span className="text-emerald-700 font-bold">
                  {t('rowMaterialsFree', { amount: formatKrw(0, locale) })}
                </span>
              </div>

              <div className="h-px bg-brown-light" />

              <div className="flex justify-between items-baseline pt-2">
                <span className="font-bold text-brown">{t('rowTotal')}</span>
                <span className="text-xl font-serif font-extrabold text-terracotta">
                  {formatKrw(finalPrice, locale)}
                </span>
              </div>
              {locale === 'en' && (
                <p className="text-right text-[10px] text-brown-medium/70">
                  {t('twdNote', {
                    amount: formatCount(Math.round(finalPrice / KRW_PER_TWD), locale),
                  })}
                </p>
              )}
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-2 pt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={() => setAgreedTerms(!agreedTerms)}
                className="w-4 h-4 rounded text-terracotta border-brown-light focus:ring-terracotta accent-terracotta mt-0.5"
              />
              <span className="text-[11px] text-brown-medium leading-relaxed">
                {t('termsAgree')}
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
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-cream text-center shadow transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isProcessing || !widgetReady
                  ? 'bg-terracotta/60 cursor-not-allowed'
                  : 'bg-terracotta hover:bg-terracotta-deep hover:shadow-md'
              }`}
            >
              {isProcessing ? (
                <>
                  <span className="w-4 h-4 border-2 border-t-transparent border-cream rounded-full animate-spin" />
                  {t('processing')}
                </>
              ) : (
                <>{t('payCta', { amount: formatKrw(finalPrice, locale) })}</>
              )}
            </button>

            <button
              type="button"
              onClick={() => router.push(`/classes/${classId}`)}
              disabled={isProcessing}
              className="w-full text-center text-xs text-brown-medium/80 hover:underline pt-2 font-medium cursor-pointer"
            >
              {t('back')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
