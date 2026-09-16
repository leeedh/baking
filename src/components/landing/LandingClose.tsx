'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export default function LandingClose() {
  const t = useTranslations('landing');

  return (
    <section
      aria-labelledby="landing-close-heading"
      className="px-5 sm:px-10 lg:px-14 py-16 sm:py-24 border-t border-gold/25"
    >
      <div className="max-w-xl mx-auto text-center space-y-6">
        <p className="text-[10px] font-bold tracking-[0.38em] uppercase text-gold">
          {t('close.eyebrow')}
        </p>
        <h2
          id="landing-close-heading"
          className="font-landing text-3xl sm:text-4xl text-cream leading-snug break-keep"
        >
          {t('close.title')}
        </h2>
        <p className="text-sm text-cream/75 leading-relaxed font-light break-keep">
          {t('close.body')}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/classes"
            className="inline-flex items-center justify-center min-h-[44px] px-8 bg-cream text-brown text-[11px] font-bold tracking-[0.22em] uppercase hover:bg-ivory transition-colors cursor-pointer w-full sm:w-auto"
          >
            {t('close.cta')}
          </Link>
          <Link
            href="/classes#baking-quiz-section"
            className="inline-flex items-center justify-center min-h-[44px] px-8 border border-gold/50 text-gold text-[11px] font-semibold tracking-[0.18em] uppercase hover:border-gold hover:text-cream transition-colors cursor-pointer w-full sm:w-auto"
          >
            {t('close.ctaQuiz')}
          </Link>
        </div>
      </div>
    </section>
  );
}
