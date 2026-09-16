'use client';

import { Link } from '@/i18n/navigation';
import { courseCategoryLabelKey } from '@/lib/course-categories';
import { formatKrw } from '@/lib/format';
import type { ClassItem } from '@/types';
import { ArrowUpRight, Star } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

interface LandingCarteProps {
  classes: ClassItem[];
}

export default function LandingCarte({ classes }: LandingCarteProps) {
  const t = useTranslations('landing');
  const tc = useTranslations('sections.catalog');
  const locale = useLocale() as 'ko' | 'en';
  const featured = [...classes].sort((a, b) => b.rating - a.rating).slice(0, 3);

  return (
    <section
      aria-labelledby="landing-carte-heading"
      className="px-5 sm:px-10 lg:px-14 py-16 sm:py-24 border-t border-gold/25"
    >
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10 space-y-3">
          <p className="text-[10px] font-bold tracking-[0.38em] uppercase text-gold">
            {t('carte.eyebrow')}
          </p>
          <h2
            id="landing-carte-heading"
            className="font-landing text-3xl sm:text-4xl text-cream break-keep"
          >
            {t('carte.title')}
          </h2>
          <p className="text-sm text-cream/70 font-light max-w-md mx-auto break-keep">
            {t('carte.description')}
          </p>
        </div>

        <div className="landing-ticket px-6 sm:px-10 py-8 sm:py-10">
          {featured.length === 0 ? (
            <p className="text-sm text-brown-medium text-center py-8">{t('carte.empty')}</p>
          ) : (
            <ol className="divide-y divide-brown-light">
              {featured.map((cls, i) => {
                const catKey = courseCategoryLabelKey(cls.category);
                const categoryLabel = catKey ? tc(`category.${catKey}`) : cls.category;
                return (
                  <li key={cls.id}>
                    <Link
                      href={`/classes/${cls.id}`}
                      aria-label={t('carte.openClass', { title: cls.title })}
                      className="group flex items-start gap-4 sm:gap-6 py-5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <span className="font-landing text-gold-deep text-lg w-8 shrink-0 pt-0.5">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-landing text-lg sm:text-xl text-brown leading-snug break-keep group-hover:text-terracotta transition-colors">
                            {cls.title}
                          </h3>
                          <span className="shrink-0 font-sans text-sm font-bold text-brown">
                            {formatKrw(cls.price, locale)}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[11px] text-brown-medium flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span>{categoryLabel}</span>
                          <span aria-hidden className="text-brown-light">
                            ·
                          </span>
                          <span className="inline-flex items-center gap-1 text-gold-deep">
                            <Star size={11} className="fill-gold" aria-hidden />
                            {t('carte.rating', { rating: cls.rating.toFixed(1) })}
                          </span>
                          <span aria-hidden className="text-brown-light">
                            ·
                          </span>
                          <span>{t('carte.lifetime')}</span>
                        </p>
                      </div>
                      <ArrowUpRight
                        size={16}
                        className="shrink-0 text-brown-medium mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-hidden
                      />
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="pt-6 mt-2 border-t border-dashed border-brown-light text-center">
            <Link
              href="/classes"
              className="inline-flex items-center justify-center min-h-[44px] px-6 text-[11px] font-bold tracking-[0.22em] uppercase text-gold-deep hover:text-terracotta transition-colors cursor-pointer"
            >
              {t('carte.viewAll')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
