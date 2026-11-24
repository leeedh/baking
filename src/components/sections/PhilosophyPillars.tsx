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
   * DC-96 · 홈(게이트웨이)은 `summary` — 본문을 2줄로 줄이고 소개 페이지로 유도한다.
   * 소개(`/about`)는 `full` — 철학 전문을 그대로 노출한다.
   */
  variant?: 'summary' | 'full';
}

/** 문구는 메시지 카탈로그(sections.philosophy.pillars)에 있고, 여기엔 표현만 남긴다. */
type PillarCopy = { title: string; body: string; footnote: string };

type Pillar = {
  Icon: LucideIcon;
  /** 행별 액센트 — gold → terracotta → brown 순으로 톤이 깊어진다. */
  text: string;
};

const PILLARS: Pillar[] = [
  { Icon: FileText, text: 'text-gold-deep' },
  { Icon: Utensils, text: 'text-terracotta-deep' },
  { Icon: MessageSquare, text: 'text-brown' },
];

/*
 * Rows 컴포지션(Hallmark layout §5-5). 예전의 "아이콘 배지 위 제목" 3열 타일은
 * 생성형 페이지의 전형(게이트 3)이라, 헤드 블록을 왼쪽 4열에 두고 hairline으로
 * 나뉜 세 행을 오른쪽 8열에 둔다. 홈에서는 바로 앞이 카드 그리드라 조밀→조용으로
 * 호흡이 바뀐다. 번호는 장식 라벨이 아니라 실제 <ol>의 순서다.
 */
export default function PhilosophyPillars({ variant = 'full' }: PhilosophyPillarsProps) {
  const t = useTranslations('sections.philosophy');
  const copy = t.raw('pillars') as PillarCopy[];
  const isSummary = variant === 'summary';
  const revealRef = useRevealOnScroll<HTMLOListElement>();

  return (
    <section
      aria-labelledby="philosophy-heading"
      className="py-20 sm:py-24 px-6 sm:px-12 bg-white/75 border-y border-brown-light/50"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8">
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-28 lg:self-start">
          <h2
            id="philosophy-heading"
            className="font-serif text-3xl sm:text-4xl font-bold text-brown leading-tight break-keep"
          >
            {t('headingPrefix')} {t('headingEm')}
          </h2>
          <p className="text-sm text-brown-medium font-light leading-relaxed break-keep">
            {t('description')}
          </p>
          {isSummary && (
            <Link href="/about" className={buttonClasses('outline')}>
              <span>{t('ctaAbout')}</span>
              <ChevronRight size={13} />
            </Link>
          )}
        </div>

        <ol ref={revealRef} className="lg:col-span-8 border-t border-brown-light">
          {PILLARS.map((pillar, i) => (
            <li
              key={copy[i]?.title ?? i}
              data-reveal-init
              style={{ '--reveal-delay': `${i * 90}ms` } as CSSProperties}
              className="grid grid-cols-[3rem_minmax(0,1fr)] sm:grid-cols-[4rem_minmax(0,1fr)] gap-x-4 py-8 sm:py-10 border-b border-brown-light"
            >
              <span
                aria-hidden
                className={cn(
                  'font-serif text-2xl sm:text-3xl font-bold leading-none',
                  pillar.text,
                )}
              >
                {i + 1}
              </span>
              <div className="space-y-3 min-w-0">
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-brown leading-snug break-keep">
                  {copy[i]?.title}
                </h3>
                <p
                  className={cn(
                    'text-sm text-brown-medium leading-relaxed font-light break-keep max-w-[65ch]',
                    isSummary && 'line-clamp-2',
                  )}
                >
                  {copy[i]?.body}
                </p>
                <p className={cn('flex items-center gap-1.5 text-xs font-semibold', pillar.text)}>
                  <pillar.Icon size={14} aria-hidden />
                  <span>{copy[i]?.footnote}</span>
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
