'use client';

import SectionHeading from '@/components/ui/SectionHeading';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import { Link } from '@/i18n/navigation';
import { buttonClasses } from '@/lib/button-classes';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import type { ClassItem } from '../../types';
import ClassCard from './ClassCard';

interface BestClassesProps {
  classes: ClassItem[];
}

// DC-96 · 홈 게이트웨이의 "베스트 클래스" 블록. 평점 상위 3개만 보여주고 /classes로 넘긴다.
export default function BestClasses({ classes }: BestClassesProps) {
  const t = useTranslations();
  const best = [...classes].sort((a, b) => b.rating - a.rating).slice(0, 3);
  const revealRef = useRevealOnScroll<HTMLDivElement>();

  if (best.length === 0) return null;

  return (
    <section aria-labelledby="best-heading" className="py-20 px-6 sm:px-12 max-w-7xl mx-auto">
      <SectionHeading
        id="best-heading"
        eyebrow="Best Selection"
        title={t('sections.best.title')}
        description={t('sections.best.description')}
        action={
          <Link href="/classes" className={buttonClasses('primary', 'md', 'shrink-0')}>
            <span>{t('sections.best.cta')}</span>
            <ChevronRight size={13} />
          </Link>
        }
      />

      <div ref={revealRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {best.map((cls, i) => (
          <div
            key={cls.id}
            data-reveal-init
            style={{ '--reveal-delay': `${i * 90}ms` } as CSSProperties}
          >
            <ClassCard cls={cls} />
          </div>
        ))}
      </div>
    </section>
  );
}
