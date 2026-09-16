'use client';

import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';

type Station = { no: string; title: string; body: string };

export default function LandingStations() {
  const t = useTranslations('landing');
  const items = t.raw('stations.items') as Station[];
  const revealRef = useRevealOnScroll<HTMLUListElement>();

  return (
    <section
      aria-labelledby="landing-stations-heading"
      className="px-5 sm:px-10 lg:px-14 py-16 sm:py-24 border-t border-gold/25"
    >
      <div className="max-w-6xl mx-auto">
        <p className="text-[10px] font-bold tracking-[0.38em] uppercase text-gold mb-3">
          {t('stations.eyebrow')}
        </p>
        <h2
          id="landing-stations-heading"
          className="font-landing text-3xl sm:text-4xl text-cream mb-12 sm:mb-16 break-keep"
        >
          {t('stations.title')}
        </h2>

        <ul ref={revealRef} className="divide-y divide-gold/20 border-y border-gold/20">
          {items.map((item, i) => (
            <li
              key={item.no}
              data-reveal-init
              style={{ '--reveal-delay': `${i * 90}ms` } as CSSProperties}
              className="grid grid-cols-12 gap-4 sm:gap-8 py-8 sm:py-10"
            >
              <span className="col-span-3 sm:col-span-2 font-landing text-3xl sm:text-5xl text-gold/80 leading-none">
                {item.no}
              </span>
              <div className="col-span-9 sm:col-span-10 lg:col-span-9">
                <h3 className="font-landing text-2xl sm:text-3xl text-cream mb-3">{item.title}</h3>
                <p className="text-sm text-cream/75 leading-relaxed max-w-xl font-light break-keep">
                  {item.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
