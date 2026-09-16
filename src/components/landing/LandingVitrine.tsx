'use client';

import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import type { CSSProperties } from 'react';

type VitrineItem = { title: string; credit: string };

const PHOTOS = [
  'https://images.unsplash.com/photo-1511018556340-d16986a1c194?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&q=80&w=800',
];

export default function LandingVitrine() {
  const t = useTranslations('landing');
  const items = t.raw('vitrine.items') as VitrineItem[];
  const revealRef = useRevealOnScroll<HTMLUListElement>();

  return (
    <section
      aria-labelledby="landing-vitrine-heading"
      className="px-5 sm:px-10 lg:px-14 py-16 sm:py-24 border-t border-gold/25"
    >
      <div className="max-w-6xl mx-auto">
        <p className="text-[10px] font-bold tracking-[0.38em] uppercase text-gold mb-3">
          {t('vitrine.eyebrow')}
        </p>
        <h2
          id="landing-vitrine-heading"
          className="font-landing text-3xl sm:text-4xl text-cream mb-10 sm:mb-14 break-keep"
        >
          {t('vitrine.title')}
        </h2>

        <ul ref={revealRef} className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-5">
          {items.map((item, i) => (
            <li
              key={item.title}
              data-reveal-init
              style={{ '--reveal-delay': `${i * 80}ms` } as CSSProperties}
              className={i === 1 ? 'sm:mt-10' : undefined}
            >
              <figure>
                <div className="relative aspect-[4/5] border border-gold/30 overflow-hidden">
                  <Image
                    src={PHOTOS[i] ?? PHOTOS[0]}
                    alt={item.title}
                    fill
                    sizes="(max-width: 639px) 100vw, 30vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="mt-3 flex items-baseline justify-between gap-3 border-t border-gold/25 pt-2">
                  <span className="font-landing text-sm text-cream">{item.title}</span>
                  <span className="text-[10px] tracking-[0.18em] uppercase text-gold">
                    {item.credit}
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
