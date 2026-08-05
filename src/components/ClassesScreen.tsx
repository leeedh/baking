'use client';

import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import type { ClassItem } from '../types';
import ClassCatalogGrid from './sections/ClassCatalogGrid';
import FaqAccordion from './sections/FaqAccordion';
import NewsletterCTA from './sections/NewsletterCTA';
import RecommendationQuiz from './sections/RecommendationQuiz';

interface ClassesScreenProps {
  /** course_catalog 뷰에서 서버가 로드한 게시 클래스 목록. */
  classes: ClassItem[];
  /** 홈 히어로 검색이 넘겨준 `?q=` 초기 검색어. */
  initialSearchQuery?: string;
}

// DC-96 (PRD-F-20) · 온라인 클래스 = 판매 화면.
// 추천 퀴즈 → 검색·카테고리 필터 + 전체 그리드 → FAQ → 뉴스레터.
export default function ClassesScreen({ classes, initialSearchQuery }: ClassesScreenProps) {
  const t = useTranslations();
  const router = useRouter();

  // 카드 클릭이 router.push라 자동 프리페치가 안 걸린다(dev에선 on-demand 컴파일 회피로 생략).
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    for (const cls of classes) {
      router.prefetch(`/classes/${cls.id}`);
    }
  }, [router, classes]);

  return (
    <div
      id="classes-screen"
      className="bg-ivory min-h-screen text-brown font-sans selection:bg-terracotta/20 selection:text-terracotta"
    >
      <section
        aria-labelledby="classes-hero-heading"
        className="pt-12 pb-4 px-6 sm:px-12 max-w-7xl mx-auto text-center space-y-3"
      >
        <p className="text-xs font-bold text-gold tracking-[0.25em] uppercase">Online Classes</p>
        <h1
          id="classes-hero-heading"
          className="font-serif text-4xl sm:text-5xl font-bold text-brown leading-tight break-keep"
        >
          {t('classes.title')}
        </h1>
        <p className="text-sm text-brown-medium font-light max-w-2xl mx-auto break-keep">
          {t('classes.subtitle')}
        </p>
      </section>

      <RecommendationQuiz classes={classes} />
      <ClassCatalogGrid classes={classes} initialSearchQuery={initialSearchQuery} />
      <FaqAccordion />
      <NewsletterCTA />
    </div>
  );
}
