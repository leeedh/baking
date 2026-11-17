'use client';

import SectionHeading from '@/components/ui/SectionHeading';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import {
  ALL_CATEGORIES,
  CATEGORY_FILTER_VALUES,
  COURSE_CATEGORIES,
  courseCategoryLabelKey,
} from '@/lib/course-categories';
import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type CSSProperties, useState, useTransition } from 'react';

// Mock Student Baked Masterpieces Data
const STUDENT_WORKS = [
  {
    id: 'sw-1',
    copyIndex: 0,
    classNameId: 'class-cookies',
    imageUrl:
      'https://images.unsplash.com/photo-1511018556340-d16986a1c194?auto=format&fit=crop&q=80&w=600',
    tag: COURSE_CATEGORIES[1].value,
  },
  {
    id: 'sw-2',
    copyIndex: 1,
    classNameId: 'class-macarons',
    imageUrl:
      // 원래 Unsplash 주소가 404였다 — Hallmark 사진 라이브러리(위키미디어, CC BY-SA 2.0). 출처는 Footer.
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Arc-en-ciel_comestible.jpg/960px-Arc-en-ciel_comestible.jpg',
    tag: COURSE_CATEGORIES[0].value,
  },
  {
    id: 'sw-3',
    copyIndex: 2,
    classNameId: 'class-tart',
    imageUrl:
      // 원래 Unsplash 주소가 404였다 — Hallmark 사진 라이브러리(위키미디어, CC BY-SA 4.0). 출처는 Footer.
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Tokio_Obsttorte_Modell-20091020-RM-101223.jpg/960px-Tokio_Obsttorte_Modell-20091020-RM-101223.jpg',
    tag: COURSE_CATEGORIES[2].value,
  },
  {
    id: 'sw-4',
    copyIndex: 3,
    classNameId: 'class-cookies',
    imageUrl:
      'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&q=80&w=600',
    tag: COURSE_CATEGORIES[1].value,
  },
];

/** 카탈로그와 같은 카테고리 값을 쓴다 — 라벨은 sections.catalog.category.*. */
const ARCHIVE_CATEGORIES = CATEGORY_FILTER_VALUES;

// DC-96 · 수강생 실습 아카이브. 홈(게이트웨이)의 신뢰 형성 섹션.
export default function StudentArchive() {
  const t = useTranslations('sections.archive');
  const tc = useTranslations('sections.catalog');
  type Work = { title: string; studentName: string; classTitle: string; comment: string };
  const works = t.raw('works') as Work[];
  const router = useRouter();
  const [activeArchiveCategory, setActiveArchiveCategory] = useState<string>(ALL_CATEGORIES);
  const [isPending, startTransition] = useTransition();
  const revealRef = useRevealOnScroll<HTMLDivElement>();

  const filteredStudentWorks = STUDENT_WORKS.filter(
    (work) => activeArchiveCategory === ALL_CATEGORIES || work.tag === activeArchiveCategory,
  );

  return (
    <section
      aria-labelledby="archive-heading"
      className="py-20 px-6 sm:px-12 bg-white/70 border-t border-b border-brown-light/60"
    >
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          id="archive-heading"
          // 실제 수강생 후기를 받기 전까지 이 섹션은 예시다. 표기를 헤딩 안에 둬 스크린리더도 함께 읽는다.
          title={
            <>
              {t('title')}{' '}
              <span className="ml-1 inline-block align-middle font-sans text-xs font-semibold text-brown-medium bg-cream border border-brown-light rounded px-2 py-0.5">
                {t('sampleBadge')}
              </span>
            </>
          }
          description={t('description')}
          divider={false}
          action={
            <div
              // biome-ignore lint/a11y/useSemanticElements: 폼 입력이 아니라 즉시 적용되는 필터 버튼 묶음이라 fieldset이 부적절하다
              role="group"
              aria-label={t('filterAria')}
              className="flex items-center gap-1.5 flex-wrap text-xs"
            >
              {ARCHIVE_CATEGORIES.map((fTag) => (
                <button
                  type="button"
                  key={fTag}
                  onClick={() => setActiveArchiveCategory(fTag)}
                  aria-pressed={activeArchiveCategory === fTag}
                  className={cn(
                    'px-3 py-2 min-h-[44px] rounded-lg font-medium cursor-pointer',
                    'transition-[background-color,color] duration-200 ease-out-soft',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    activeArchiveCategory === fTag
                      ? 'bg-gold-deep text-white'
                      : 'bg-cream text-brown-medium hover:bg-brown-light/60',
                  )}
                >
                  {fTag === ALL_CATEGORIES
                    ? t('allWorks')
                    : courseCategoryLabelKey(fTag)
                      ? tc(`category.${courseCategoryLabelKey(fTag)}`)
                      : fTag}
                </button>
              ))}
            </div>
          }
        />

        {/* Student Work Cards Grid */}
        <div ref={revealRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredStudentWorks.map((work, i) => {
            const copy = works[work.copyIndex];
            return (
              <div
                key={work.id}
                data-reveal-init
                style={{ '--reveal-delay': `${(i % 4) * 70}ms` } as CSSProperties}
                className="bg-white rounded-card overflow-hidden border border-brown-light shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-[box-shadow,transform] duration-300 ease-out-soft group flex flex-col"
              >
                {/* Photo frame with zoom */}
                <div className="relative aspect-[4/3] overflow-hidden bg-cream">
                  <img
                    referrerPolicy="no-referrer"
                    src={work.imageUrl}
                    alt={copy?.title ?? ''}
                    width={600}
                    height={450}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-2.5 left-2.5 bg-brown text-cream text-[11px] font-medium px-2 py-0.5 rounded">
                    {courseCategoryLabelKey(work.tag)
                      ? tc(`category.${courseCategoryLabelKey(work.tag)}`)
                      : work.tag}
                  </span>
                </div>

                {/* Info and commentary */}
                <div className="p-5 flex-grow flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-brown truncate">
                        {copy?.studentName}
                      </span>
                      <div className="flex text-gold-deep shrink-0" aria-label={t('ratingAria')}>
                        <Star size={10} className="fill-current" />
                        <Star size={10} className="fill-current" />
                        <Star size={10} className="fill-current" />
                        <Star size={10} className="fill-current" />
                        <Star size={10} className="fill-current" />
                      </div>
                    </div>
                    <span className="block text-[11px] text-gold-deep font-semibold">
                      {copy?.classTitle}
                    </span>
                    <h3 className="font-serif text-sm font-semibold text-brown line-clamp-1 pt-1">
                      {copy?.title}
                    </h3>
                    <p className="text-xs text-brown-medium leading-relaxed font-light line-clamp-4 pt-1 break-keep">
                      “{copy?.comment}”
                    </p>
                  </div>

                  <div className="pt-2 border-t border-cream flex items-center justify-between gap-2 text-[11px] text-brown-medium/80">
                    <span>Atelier Verified student</span>
                    <button
                      type="button"
                      onClick={() =>
                        startTransition(() => router.push(`/classes/${work.classNameId}`))
                      }
                      aria-busy={isPending || undefined}
                      className="text-terracotta hover:underline font-bold cursor-pointer rounded px-1 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {t('viewClass')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
