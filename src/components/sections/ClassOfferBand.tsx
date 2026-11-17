import { Link } from '@/i18n/navigation';
import { buttonClasses } from '@/lib/button-classes';
import { formatKrw } from '@/lib/format';
import { ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import type { ClassItem } from '../../types';

interface ClassOfferBandProps {
  classes: ClassItem[];
}

/*
 * 홈의 마지막 섹션 — Hallmark anatomy "buy"의 close(offer again).
 * 예전에는 백엔드가 없어 비활성인 뉴스레터 밴드로 끝났다(게이트 85). 구매가 목적인
 * 페이지는 상품과 가격, 구매 행동으로 닫는다. 데이터는 HomeScreen이 이미 받은 목록에서
 * BestClasses와 같은 평점 정렬로 1위만 고른다 — 새 조회가 없다.
 */
export default function ClassOfferBand({ classes }: ClassOfferBandProps) {
  const t = useTranslations();
  const locale = useLocale() as 'ko' | 'en';
  const top = [...classes].sort((a, b) => b.rating - a.rating)[0];
  if (!top) return null;

  const discounted = top.originalPrice > top.price;

  return (
    <section
      aria-labelledby="offer-heading"
      className="bg-brown text-cream py-20 sm:py-24 px-6 sm:px-12"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
        <div className="lg:col-span-5 space-y-4">
          <h2
            id="offer-heading"
            className="font-serif text-3xl sm:text-4xl font-bold leading-tight break-keep"
          >
            {t('sections.offer.heading')}
          </h2>
          <p className="text-sm text-cream/80 font-light leading-relaxed break-keep">
            {t('sections.offer.lead')}
          </p>
        </div>

        {/* 단일 offer: 사진 · 제목 · 가격 · 행동. 이 면은 어둡다 — 골드 텍스트는 gold(4.75:1). */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 items-center">
          <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-brown-deep">
            <Image
              referrerPolicy="no-referrer"
              src={top.thumbnail}
              alt={top.title}
              fill
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 40vw, 24vw"
              className="object-cover"
            />
          </div>
          <div className="space-y-4 min-w-0">
            <p className="text-xs text-gold font-semibold">{top.category}</p>
            <h3 className="font-serif text-xl sm:text-2xl font-bold leading-snug break-keep">
              {top.title}
            </h3>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl font-bold tabular-nums">
                {formatKrw(top.price, locale)}
              </span>
              {discounted && (
                <span className="text-sm text-cream/70 line-through tabular-nums">
                  {formatKrw(top.originalPrice, locale)}
                </span>
              )}
              <span className="text-xs text-gold font-semibold">{t('sections.card.oneTime')}</span>
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link href={`/classes/${top.id}`} className={buttonClasses('secondary', 'lg')}>
                <span>{t('sections.card.cta')}</span>
                <ChevronRight size={14} aria-hidden />
              </Link>
              <Link
                href="/classes"
                className="inline-flex items-center min-h-[48px] px-2 text-sm font-semibold text-cream underline underline-offset-4 decoration-cream/40 hover:decoration-cream transition-[text-decoration-color] rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {t('sections.offer.allCta')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
