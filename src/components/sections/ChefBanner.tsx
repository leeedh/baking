'use client';

import { Link } from '@/i18n/navigation';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

// DC-96 · 셰프 배너. 홈 게이트웨이에서 소개(/about)·도서(/books)로 보내는 진입점.
export default function ChefBanner() {
  const t = useTranslations('sections.chef');
  const tc = useTranslations('common');
  return (
    <section
      aria-labelledby="chef-heading"
      className="py-20 px-6 sm:px-12 max-w-7xl mx-auto border-b border-brown-light/60"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left: Chef Narrative Intro */}
        <div className="lg:col-span-7 space-y-6">
          <h2
            id="chef-heading"
            className="font-serif text-3xl sm:text-4xl font-bold text-brown leading-tight break-keep"
          >
            {t('headingPrefix')} {t('headingName')}
            {t('headingSuffix')}
          </h2>
          <p className="text-sm text-brown-medium font-light leading-relaxed break-keep">
            {t('body1')}
          </p>
          <p className="text-sm text-brown-medium font-light leading-relaxed break-keep">
            {t.rich('body2', {
              strong: (chunks) => <strong>{chunks}</strong>,
              em: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/about"
              className="px-6 py-3 bg-brown hover:bg-terracotta text-white text-xs font-bold rounded-xl shadow-md transition-[color,background-color,border-color,box-shadow,opacity,transform] cursor-pointer flex items-center gap-1"
            >
              <span>{t('ctaAbout')}</span>
              <ChevronRight size={13} />
            </Link>

            <Link
              href="/books"
              className="px-6 py-3 bg-white hover:bg-cream text-brown-medium border border-brown-light text-xs font-semibold rounded-xl transition-[color,background-color,border-color,box-shadow,opacity,transform] cursor-pointer"
            >
              {t('ctaBooks')}
            </Link>
          </div>
        </div>

        {/* Right: Splendid interactive card */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-brown-light rounded-3xl p-8 relative overflow-hidden shadow-panel max-w-sm mx-auto">
            {/* Gold layout indicator badge */}
            <div className="absolute top-0 right-0 bg-gold-deep text-white text-[11px] font-bold px-3 py-1 rounded-bl-xl">
              {t('cardBadge')}
            </div>

            <div className="flex flex-col items-center text-center space-y-4">
              {/*
                셰프 초상 자리 — 실제 사진을 받기 전까지 스톡 인물 사진 대신 이니셜 표지를 둔다.
                사진이 생기면 이 원 안에 <img alt={tc('chefPortraitAria')}>를 다시 넣을 것.
              */}
              <div
                role="img"
                aria-label={tc('chefPortraitAria')}
                className="w-28 h-28 rounded-full overflow-hidden border-4 border-cream shadow-md bg-brown flex items-center justify-center"
              >
                <span aria-hidden className="font-serif text-3xl font-bold text-gold">
                  {tc('chefMonogram')}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gold-deep bg-gold/10 px-2 py-0.5 rounded">
                  Sole masterpiece
                </span>
                <h3 className="font-serif text-xl font-bold text-brown">{t('cardName')}</h3>
                <p className="text-xs text-brown-medium/80 font-medium font-serif italic">
                  {t('cardRole')}
                </p>
              </div>

              <blockquote className="text-xs text-brown-medium/90 italic font-light leading-relaxed bg-cream/50 p-3 rounded-xl border border-brown-light/40">
                {t('quote')}
              </blockquote>

              <div className="pt-2 border-t border-cream w-full text-[11px] text-brown-medium flex justify-around font-medium">
                <div>{t('stat1')}</div>
                <div>{t('stat2')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
