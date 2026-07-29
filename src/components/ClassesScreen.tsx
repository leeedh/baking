'use client';

import { useRouter } from '@/i18n/navigation';
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
      className="bg-[#FDFBF7] min-h-screen text-[#2A211B] font-sans selection:bg-[#B65538]/20 selection:text-[#B65538]"
    >
      <section className="pt-12 pb-4 px-6 sm:px-12 max-w-7xl mx-auto text-center space-y-3">
        <span className="text-xs font-bold text-[#B0863C] tracking-[0.25em] uppercase">
          Online Classes
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#2A211B] leading-tight keep-all break-keep">
          온라인 클래스
        </h1>
        <p className="text-sm text-[#5F4E43] font-light max-w-2xl mx-auto keep-all break-keep">
          평생 소장 VOD로 만나는 Atelier Crème의 프렌치 디저트 마스터 코스입니다. 추천 퀴즈로 나에게
          맞는 클래스를 먼저 찾아보세요.
        </p>
      </section>

      <RecommendationQuiz classes={classes} />
      <ClassCatalogGrid classes={classes} initialSearchQuery={initialSearchQuery} />
      <FaqAccordion />
      <NewsletterCTA />
    </div>
  );
}
