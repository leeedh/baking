'use client';

import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import type { ClassItem } from '../types';
import AddClassButton from './admin/AddClassButton';
import ClassCatalogGrid from './sections/ClassCatalogGrid';
import FaqAccordion from './sections/FaqAccordion';
import RecommendationQuiz from './sections/RecommendationQuiz';

interface ClassesScreenProps {
  /** course_catalog 뷰에서 서버가 로드한 게시 클래스 목록. */
  classes: ClassItem[];
  /** 홈 히어로 검색이 넘겨준 `?q=` 초기 검색어. */
  initialSearchQuery?: string;
}

// DC-96 (PRD-F-20) · 온라인 클래스 = 판매 화면.
// 짧은 제목 → 검색·카테고리 필터 + 전체 그리드 → 추천 퀴즈(고르기 어려울 때) → FAQ.
// Hallmark hero posture "Index": 목록이 이 페이지에 오는 이유라서 첫 화면에 카드가 보여야 한다.
// 예전에는 가운데 제목과 퀴즈가 첫 화면을 다 쓰고 목록은 접힌 아래에 있었다(게이트 79).
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
        className="pt-10 sm:pt-12 px-6 sm:px-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-8 lg:items-end"
      >
        <h1
          id="classes-hero-heading"
          className="lg:col-span-5 font-serif text-4xl sm:text-5xl font-bold text-brown leading-tight break-keep"
        >
          {t('classes.title')}
        </h1>
        <p className="lg:col-span-7 text-sm text-brown-medium font-light leading-relaxed max-w-[65ch] break-keep lg:pb-2">
          {t('classes.subtitle')}
        </p>
      </section>

      {/* 운영자에게만 보인다(클라이언트 판정 — 캐시된 목록에 세션을 섞지 않는다). */}
      <AddClassButton />

      <ClassCatalogGrid classes={classes} initialSearchQuery={initialSearchQuery} />
      <RecommendationQuiz classes={classes} />
      <FaqAccordion />
    </div>
  );
}
