'use client';

import Button from '@/components/ui/Button';
import SectionHeading from '@/components/ui/SectionHeading';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import { cn } from '@/lib/cn';
import { BadgeAlert, Search } from 'lucide-react';
import { type CSSProperties, useState } from 'react';
import type { ClassItem } from '../../types';
import ClassCard from './ClassCard';

interface ClassCatalogGridProps {
  /** course_catalog 뷰에서 서버가 로드한 게시 클래스 목록. */
  classes: ClassItem[];
  /** DC-96 · 홈 히어로 검색이 `/classes?q=`로 넘겨준 초기 검색어. */
  initialSearchQuery?: string;
}

const CATEGORIES = ['All', '정통 프렌치 디저트', '클래식 구움과자', '모던 타르트'];

// DC-96 · 전체 클래스 그리드 + 검색·카테고리 필터. 온라인 클래스 페이지(/classes) 본체.
export default function ClassCatalogGrid({
  classes,
  initialSearchQuery = '',
}: ClassCatalogGridProps) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const revealRef = useRevealOnScroll<HTMLDivElement>();

  const filteredClasses = classes.filter((cls) => {
    const matchesCategory = selectedCategory === 'All' || cls.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      cls.title.toLowerCase().includes(q) ||
      cls.instructor.toLowerCase().includes(q) ||
      cls.tags.some((tag) => tag.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <span id="catalog-grid-anchor" className="block relative -top-6" />
      <section aria-labelledby="catalog-heading" className="py-20 px-6 sm:px-12 max-w-7xl mx-auto">
        {/* Section Heading with curation touch */}
        <SectionHeading
          id="catalog-heading"
          eyebrow="The Atelier Lineup"
          title="아틀리에 클래스 라인업"
          description="각 클래스는 영구 무제한 수강, 정밀 레시피 PDF 노트, 카페 대량 생산용 배합 파일 권리가 동시 상속됩니다."
          action={
            <div className="w-full md:w-auto space-y-3">
              {/* 검색 입력 — 홈 히어로에서 넘어온 ?q= 값을 이어받아 이 화면에서 계속 다듬는다. */}
              <div className="relative w-full md:w-72">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brown-medium/70">
                  <Search size={13} />
                </span>
                <input
                  id="catalog-search-input"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="클래스·강사·키워드 검색"
                  aria-label="클래스 검색"
                  className="w-full pl-8 pr-3 py-2.5 min-h-[44px] bg-white border border-brown-light rounded-xl text-xs text-brown placeholder:text-brown-medium/60 transition-[border-color] hover:border-terracotta/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
              </div>

              {/* Aesthetic tabs selector */}
              <div className="relative w-full md:w-auto">
                <div
                  // biome-ignore lint/a11y/useSemanticElements: 폼 입력이 아니라 즉시 적용되는 필터 버튼 묶음이라 fieldset이 부적절하다
                  role="group"
                  aria-label="카테고리 필터"
                  className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 w-full md:w-auto"
                >
                  {CATEGORIES.map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      aria-pressed={selectedCategory === cat}
                      className={cn(
                        'px-4 py-2.5 min-h-[44px] text-xs font-medium rounded-xl whitespace-nowrap cursor-pointer',
                        'transition-[background-color,color,border-color,box-shadow] duration-300 ease-out-soft',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        selectedCategory === cat
                          ? 'bg-brown text-cream font-semibold shadow-card'
                          : 'bg-white text-brown-medium border border-brown-light hover:text-brown hover:bg-cream/80',
                      )}
                    >
                      {cat === 'All' ? '전체 클래스' : cat}
                    </button>
                  ))}
                </div>
                {/* Right fade hint for horizontal scroll on mobile */}
                <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-cream to-transparent md:hidden" />
              </div>
            </div>
          }
        />

        {/* 필터 결과 개수는 시각적으로는 그리드가 말해 주지만 스크린 리더에는 알려야 한다. */}
        <p aria-live="polite" className="sr-only">
          {filteredClasses.length}개의 클래스가 검색되었습니다.
        </p>

        {/* Catalog Grid Area */}
        {filteredClasses.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-brown-light p-8 max-w-lg mx-auto">
            <BadgeAlert className="mx-auto text-terracotta mb-3" size={32} />
            <h3 className="font-serif text-base font-bold text-brown">
              일치하는 디저트 에디션이 없습니다.
            </h3>
            <p className="text-brown-medium text-xs font-light mt-1">
              검색어나 선택하신 카테고리 필터를 검토해주세요.
            </p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
            >
              전체 목록 보기 초기화
            </Button>
          </div>
        ) : (
          <div
            ref={revealRef}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8"
          >
            {filteredClasses.map((cls, i) => (
              <div
                key={cls.id}
                data-reveal-init
                // 스태거 — 한 행이 순차로 떠오르게 한다(4열이므로 4개 주기).
                style={{ '--reveal-delay': `${(i % 4) * 70}ms` } as CSSProperties}
              >
                <ClassCard cls={cls} />
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
