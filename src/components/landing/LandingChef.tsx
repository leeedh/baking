'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

const CHEF_PHOTO =
  'https://images.unsplash.com/photo-1581299894007-aaa50297cf16?auto=format&fit=crop&q=80&w=900';

export default function LandingChef() {
  const t = useTranslations('landing');

  return (
    <section
      aria-labelledby="landing-chef-heading"
      className="border-t border-gold/25"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 max-w-6xl mx-auto">
        <div className="relative lg:col-span-5 aspect-[4/5] lg:aspect-auto lg:min-h-[520px]">
          <Image
            src={CHEF_PHOTO}
            alt={t('chef.photoAlt')}
            fill
            sizes="(max-width: 1023px) 100vw, 42vw"
            className="object-cover object-top brightness-[0.85]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-hero-ink via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-hero-ink/40" />
        </div>

        <div className="lg:col-span-7 flex flex-col justify-center px-5 sm:px-10 lg:px-14 py-12 sm:py-16 space-y-6">
          <p className="text-[10px] font-bold tracking-[0.38em] uppercase text-gold">
            {t('chef.eyebrow')}
          </p>
          <blockquote>
            <p
              id="landing-chef-heading"
              className="font-landing italic text-2xl sm:text-3xl lg:text-[2.15rem] leading-snug text-cream break-keep"
            >
              {t('chef.quote')}
            </p>
          </blockquote>
          <div>
            <p className="font-landing text-lg text-gold">{t('chef.name')}</p>
            <p className="text-[11px] tracking-[0.18em] uppercase text-cream/60 mt-1">
              {t('chef.role')}
            </p>
          </div>
          <p className="text-sm text-cream/75 leading-relaxed font-light max-w-lg break-keep">
            {t('chef.body')}
          </p>
          <Link
            href="/about"
            className="inline-flex items-center justify-center self-start min-h-[44px] px-6 border border-gold/50 text-gold text-[11px] font-semibold tracking-[0.18em] uppercase hover:border-gold hover:text-cream transition-colors cursor-pointer"
          >
            {t('chef.cta')}
          </Link>
        </div>
      </div>
    </section>
  );
}
