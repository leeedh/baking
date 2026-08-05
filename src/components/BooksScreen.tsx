'use client';

import type { BookView } from '@/lib/books';
import { BookOpen, Check, ExternalLink, ShoppingBag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

/**
 * 도서 화면 — **자체 결제·배송이 없다.** 추천 큐레이션 도서를 소개하고 구매 CTA는 외부
 * 커머스(쿠팡)로 새 탭 이동만 한다(DC-66). 데이터는 정적 상수(`books-data.ts`)를 서버가
 * `getBooks()`로 주입한다(DC-67). 예전의 가짜 alert 구매/다운로드 시뮬레이션은 제거됐다.
 */
export default function BooksScreen({ books }: { books: BookView[] }) {
  const t = useTranslations('books');
  const [selectedSlug, setSelectedSlug] = useState(books[0]?.slug ?? '');
  const selectedBook = books.find((b) => b.slug === selectedSlug) ?? books[0];

  if (!selectedBook) {
    return (
      <div className="bg-cream min-h-screen flex items-center justify-center text-brown-medium">
        <p className="text-sm">{t('empty')}</p>
      </div>
    );
  }

  return (
    <div
      id="books-screen"
      className="bg-cream min-h-screen text-brown font-sans selection:bg-terracotta/20 selection:text-terracotta"
    >
      {/* Editorial Title Banner */}
      <section
        aria-labelledby="books-hero-heading"
        className="pt-12 pb-16 px-6 sm:px-12 max-w-7xl mx-auto border-b border-brown-light/80"
      >
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 text-gold text-[11px] font-bold tracking-widest uppercase border border-gold/20 shadow-sm">
            <BookOpen size={12} />
            {t('badge')}
          </span>
          <h1
            id="books-hero-heading"
            className="font-serif text-3xl sm:text-5xl font-bold text-brown leading-tight break-keep"
          >
            {t('title1')} <span className="font-serif italic text-terracotta">{t('titleEm')}</span>
          </h1>
          <p className="text-sm text-brown-medium font-light leading-relaxed max-w-2xl mx-auto break-keep">
            {t('subtitle')}
          </p>
        </div>
      </section>

      {/* Main Dual Columns Layout */}
      <section
        aria-label={t('listAria')}
        className="py-12 px-6 sm:px-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12"
      >
        {/* Left Side: Books Selector & Thumbnails */}
        <div className="lg:col-span-4 space-y-6">
          <h3 className="font-serif text-xs font-bold text-gold tracking-wider uppercase mb-2">
            {t('selectEdition')}
          </h3>

          <div className="space-y-4">
            {books.map((b) => {
              const active = b.slug === selectedSlug;
              return (
                <button
                  type="button"
                  key={b.slug}
                  onClick={() => setSelectedSlug(b.slug)}
                  className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex gap-4 ${
                    active
                      ? 'bg-white border-terracotta shadow-md -translate-y-0.5'
                      : 'bg-white/50 border-brown-light hover:bg-white hover:border-gold/40'
                  }`}
                >
                  <div className="w-16 sm:w-20 aspect-[3/4] bg-brown rounded overflow-hidden shadow-md shrink-0 relative">
                    <img
                      referrerPolicy="no-referrer"
                      src={b.thumbnail}
                      alt=""
                      className="w-full h-full object-cover opacity-90"
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <h4 className="font-serif text-sm font-bold text-brown leading-snug line-clamp-3">
                      {b.title}
                    </h4>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs font-bold text-terracotta">
                        ₩{b.price.toLocaleString()}
                      </span>
                      {b.discountPercent > 0 && (
                        <span className="text-[10px] text-terracotta font-black">
                          {b.discountPercent}% OFF
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* External commerce notice */}
          <div className="p-6 bg-brown text-cream rounded-2xl border border-gold/30 space-y-3">
            <span className="text-[9px] bg-gold text-brown px-2 py-0.5 rounded font-extrabold tracking-widest uppercase">
              {t('noticeBadge')}
            </span>
            <h4 className="font-serif text-base font-bold">{t('noticeTitle')}</h4>
            <p className="text-[11px] text-white/70 leading-relaxed font-light">
              {t('noticeDesc')}
            </p>
          </div>
        </div>

        {/* Right Side: High-End Details, Contents */}
        <div className="lg:col-span-8 bg-white border border-brown-light rounded-3xl p-6 sm:p-10 space-y-8 shadow-sm">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-brown-light pb-5">
              <div>
                <span className="text-[11px] text-gold font-bold block mb-1">
                  {t('selectedManual')}
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-brown mt-2 leading-tight">
                  {selectedBook.title}
                </h2>
                <p className="text-xs sm:text-sm text-terracotta font-medium font-serif mt-1">
                  {selectedBook.subtitle}
                </p>
              </div>

              {/* Price & Discount Indicator (참고가 — 실제 결제는 외부 쇼핑몰) */}
              <div className="text-right shrink-0 bg-cream p-4 rounded-xl border border-brown-light">
                {selectedBook.discountPercent > 0 && (
                  <span className="text-xs text-stone-400 line-through block">
                    ₩{selectedBook.listPrice.toLocaleString()}
                  </span>
                )}
                <div className="flex items-center gap-1.5 justify-end">
                  {selectedBook.discountPercent > 0 && (
                    <span className="text-terracotta text-xs font-black">
                      {selectedBook.discountPercent}% OFF
                    </span>
                  )}
                  <span className="text-xl font-bold text-brown">
                    ₩{selectedBook.price.toLocaleString()}
                  </span>
                </div>
                <span className="text-[10px] text-stone-400 font-light block mt-0.5">
                  {t('priceRef')}
                </span>
              </div>
            </div>

            <p className="text-brown-medium text-sm leading-relaxed font-light">
              {selectedBook.description}
            </p>
          </div>

          {/* Book Chapters list */}
          {selectedBook.chapters.length > 0 && (
            <div className="space-y-3 bg-cream/40 p-6 rounded-2xl border border-brown-light/70">
              <h4 className="font-serif text-sm font-bold text-brown flex items-center gap-2">
                <span className="w-1.5 h-3 bg-gold rounded-full inline-block" />
                {t('chaptersTitle', { count: selectedBook.chapters.length })}
              </h4>

              <div className="divide-y divide-brown-light text-xs">
                {selectedBook.chapters.map((ch) => (
                  <div
                    key={ch}
                    className="py-3 font-medium text-brown-medium flex items-start gap-2.5"
                  >
                    <Check size={13} className="text-gold mt-0.5 shrink-0" />
                    <span>{ch}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action area — 외부 커머스 이동 */}
          <div className="pt-4 border-t border-brown-light flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-brown-medium font-light flex items-center gap-1.5">
              <ShoppingBag size={13} className="text-gold" />
              {t('externalNotice')}
            </p>

            <div className="w-full sm:w-auto">
              {selectedBook.isPurchaseUrlReady ? (
                <a
                  href={selectedBook.externalPurchaseUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="w-full sm:w-auto px-10 py-3 bg-terracotta hover:bg-terracotta-deep text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{t('buyCta')}</span>
                  <ExternalLink size={14} />
                </a>
              ) : (
                <span className="w-full sm:w-auto px-10 py-3 bg-stone-200 text-stone-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                  <span>{t('buyUnavailable')}</span>
                </span>
              )}
            </div>
          </div>

          {/* 쿠팡 파트너스 제휴 고지 (필수) */}
          <p className="text-[10.5px] text-stone-400 font-light leading-relaxed border-t border-brown-light pt-4">
            {t('disclosure')}
          </p>
        </div>
      </section>
    </div>
  );
}
