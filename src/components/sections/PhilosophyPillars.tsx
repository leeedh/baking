'use client';

import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import { Link } from '@/i18n/navigation';
import { buttonClasses } from '@/lib/button-classes';
import { cn } from '@/lib/cn';
import { ChevronRight, FileText, type LucideIcon, MessageSquare, Utensils } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';

interface PhilosophyPillarsProps {
  /**
   * DC-96 · 홈(게이트웨이)은 `summary` — 카드 본문을 3줄로 줄이고 소개 페이지로 유도한다.
   * 소개(`/about`)는 `full` — 철학 전문을 그대로 노출한다.
   */
  variant?: 'summary' | 'full';
}

/** 문구는 메시지 카탈로그(sections.philosophy.pillars)에 있고, 여기엔 표현만 남긴다. */
type PillarCopy = { title: string; body: string; footnote: string };

type Pillar = {
  no: string;
  Icon: LucideIcon;
  /** 카드별 액센트 — gold → terracotta → brown 순으로 톤이 깊어진다. */
  accent: { badge: string; badgeHover: string; border: string; text: string };
};

const PILLARS: Pillar[] = [
  {
    no: '01',
    Icon: FileText,
    accent: {
      badge: 'bg-gold/10 text-gold',
      badgeHover: 'group-hover:bg-gold group-hover:text-white',
      border: 'hover:border-gold/30',
      text: 'text-gold',
    },
  },
  {
    no: '02',
    Icon: Utensils,
    accent: {
      badge: 'bg-terracotta/10 text-terracotta',
      badgeHover: 'group-hover:bg-terracotta group-hover:text-white',
      border: 'hover:border-terracotta/30',
      text: 'text-terracotta',
    },
  },
  {
    no: '03',
    Icon: MessageSquare,
    accent: {
      badge: 'bg-brown/10 text-brown',
      badgeHover: 'group-hover:bg-brown group-hover:text-white',
      border: 'hover:border-brown/30',
      text: 'text-brown',
    },
  },
];

export default function PhilosophyPillars({ variant = 'full' }: PhilosophyPillarsProps) {
  const t = useTranslations('sections.philosophy');
  const copy = t.raw('pillars') as PillarCopy[];
  const isSummary = variant === 'summary';
  const revealRef = useRevealOnScroll<HTMLDivElement>();

  return (
    <section
      aria-labelledby="philosophy-heading"
      className="py-20 px-6 sm:px-12 bg-white/75 border-b border-brown-light/50"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
          {/* eyebrow는 헤딩이 아니다 — 예전에는 <h2>였고 실제 제목이 <h3>여서 순서가 역전됐다. */}
          <p className="font-serif text-xs font-bold text-gold tracking-[0.25em] uppercase">
            Premium Standard
          </p>
          <h2
            id="philosophy-heading"
            className="font-serif text-3xl sm:text-4xl font-bold text-brown leading-tight break-keep"
          >
            {t('headingPrefix')}{' '}
            <span className="font-serif italic text-terracotta">{t('headingEm')}</span>
          </h2>
          <p className="text-sm text-brown-medium font-light break-keep">
            {t('description')}
          </p>
        </div>

        <div ref={revealRef} className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
          {PILLARS.map((pillar, i) => (
            <div
              key={pillar.no}
              data-reveal-init
              style={{ '--reveal-delay': `${i * 90}ms` } as CSSProperties}
              className={cn(
                'p-8 bg-cream/40 rounded-2xl border border-brown-light/65 space-y-4 group',
                'transition-[background-color,border-color,box-shadow] duration-300 ease-out-soft hover:bg-cream/70 hover:shadow-card-hover',
                pillar.accent.border,
              )}
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center font-serif text-lg font-bold transition-all duration-300 ease-out-soft',
                  pillar.accent.badge,
                  pillar.accent.badgeHover,
                )}
              >
                {pillar.no}
              </div>
              <h3 className="font-serif text-xl font-bold text-brown break-keep">{copy[i]?.title}</h3>
              <p
                className={cn(
                  'text-xs sm:text-[13px] text-brown-medium leading-relaxed font-light break-keep',
                  isSummary && 'line-clamp-3',
                )}
              >
                {copy[i]?.body}
              </p>
              <div
                className={cn(
                  'pt-2 flex items-center gap-1.5 text-xs font-semibold',
                  pillar.accent.text,
                )}
              >
                <pillar.Icon size={14} />
                <span>{copy[i]?.footnote}</span>
              </div>
            </div>
          ))}
        </div>

        {isSummary && (
          <div className="mt-12 text-center">
            <Link href="/about" className={buttonClasses('outline')}>
              <span>{t('ctaAbout')}</span>
              <ChevronRight size={13} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
