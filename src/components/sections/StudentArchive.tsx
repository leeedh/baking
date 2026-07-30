'use client';

import SectionHeading from '@/components/ui/SectionHeading';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { Star } from 'lucide-react';
import { type CSSProperties, useState, useTransition } from 'react';

// Mock Student Baked Masterpieces Data
const STUDENT_WORKS = [
  {
    id: 'sw-1',
    title: '로즈골드 빛 카라멜 오리지널 마들렌',
    studentName: '최지원 수강생',
    classTitle: '카라멜 테라코타 구움과자 클래스',
    classNameId: 'class-cookies',
    comment:
      '탄 버터 온도를 정확하게 시각적으로 비교해 주는 덕분에 생전 처음으로 배꼽이 예쁘게 올라오고 버터 풍미 가득한 마들렌이 상업 오븐 없이도 완벽하게 완성됐어요!',
    imageUrl:
      'https://images.unsplash.com/photo-1511018556340-d16986a1c194?auto=format&fit=crop&q=80&w=600',
    tag: '클래식 구움과자',
  },
  {
    id: 'sw-2',
    title: '영롱한 할로우 프리 꼬끄 & 무화과 가나슈 마카롱',
    studentName: '이지연 수강생',
    classTitle: '피에르 마카롱 마스터 클래스',
    classNameId: 'class-macarons',
    comment:
      '동영상 일시정지 해가며 습도 분석을 고수했더니, 그동안 골머리 썩히던 마카로나쥬 꼬끄 과건조나 오븐 불균형 구정이 드디어 정복됐어요. 대만족!',
    imageUrl:
      'https://images.unsplash.com/photo-1558961309-dbdf71799f14?auto=format&fit=crop&q=80&w=600',
    tag: '정통 프렌치 디저트',
  },
  {
    id: 'sw-3',
    title: '계절 과일 가득 사블레 파트 생또노레',
    studentName: 'Marcia Liu (대만 수강생)',
    classTitle: '타르트 에디토리얼 마르탱 클래스',
    classNameId: 'class-tart',
    comment:
      '폰사주 과정이 가이드라인 덕에 매우 단단하게 완성되어 구워도 무너지지 않았습니다! 크레뫼 바닐라 크림의 고급스러운 맛은 단연 현지 디저트 숍 이상입니다.',
    imageUrl:
      'https://images.unsplash.com/photo-1464305795204-6f5bdf7f8141?auto=format&fit=crop&q=80&w=600',
    tag: '모던 타르트',
  },
  {
    id: 'sw-4',
    title: '쫀득함이 살아있는 골든 피스톤 쿠키 컬렉션',
    studentName: '황시현 카페 대표',
    classTitle: '카라멜 테라코타 구움과자 클래스',
    classNameId: 'class-cookies',
    comment:
      '구움과자 라인에 솔티드 오리지널 쿠키를 추가하자마자 매장 배달 및 현장 판매량이 150% 가량 수직 신장했습니다. 원가 계산 전용 PDF 엑셀이 아주 요긴했어요.',
    imageUrl:
      'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&q=80&w=600',
    tag: '클래식 구움과자',
  },
];

const ARCHIVE_CATEGORIES = ['All', '정통 프렌치 디저트', '클래식 구움과자', '모던 타르트'];

// DC-96 · 수강생 실습 아카이브. 홈(게이트웨이)의 신뢰 형성 섹션.
export default function StudentArchive() {
  const router = useRouter();
  const [activeArchiveCategory, setActiveArchiveCategory] = useState('All');
  const [isPending, startTransition] = useTransition();
  const revealRef = useRevealOnScroll<HTMLDivElement>();

  const filteredStudentWorks = STUDENT_WORKS.filter(
    (work) => activeArchiveCategory === 'All' || work.tag === activeArchiveCategory,
  );

  return (
    <section
      aria-labelledby="archive-heading"
      className="py-20 px-6 sm:px-12 bg-white/70 border-t border-b border-brown-light/60"
    >
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          id="archive-heading"
          eyebrow="Student Achievements"
          title="수강생 실습 아카이브"
          description="Atelier Crème 오리지널 교육과정을 수강하고 가내 스튜디오 및 상업 오븐에서 직접 구워낸 리얼 포토 후기입니다."
          divider={false}
          action={
            <div
              // biome-ignore lint/a11y/useSemanticElements: 폼 입력이 아니라 즉시 적용되는 필터 버튼 묶음이라 fieldset이 부적절하다
              role="group"
              aria-label="실습작 카테고리 필터"
              className="flex items-center gap-1.5 flex-wrap text-[11px]"
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
                      ? 'bg-gold text-white'
                      : 'bg-cream text-brown-medium hover:bg-brown-light/60',
                  )}
                >
                  {fTag === 'All' ? '전체 실습작' : fTag}
                </button>
              ))}
            </div>
          }
        />

        {/* Student Work Cards Grid */}
        <div ref={revealRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredStudentWorks.map((work, i) => (
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
                  alt={work.title}
                  width={600}
                  height={450}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out-soft"
                />
                <span className="absolute bottom-2.5 left-2.5 bg-black/70 backdrop-blur-sm text-cream text-[11px] font-medium px-2 py-0.5 rounded">
                  {work.tag}
                </span>
              </div>

              {/* Info and commentary */}
              <div className="p-5 flex-grow flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-brown truncate">
                      {work.studentName}
                    </span>
                    <div className="flex text-gold shrink-0" aria-label="별점 5점 만점">
                      <Star size={10} className="fill-current" />
                      <Star size={10} className="fill-current" />
                      <Star size={10} className="fill-current" />
                      <Star size={10} className="fill-current" />
                      <Star size={10} className="fill-current" />
                    </div>
                  </div>
                  <span className="block text-[11px] text-gold font-semibold">
                    {work.classTitle}
                  </span>
                  <h3 className="font-serif text-sm font-semibold text-brown line-clamp-1 pt-1">
                    {work.title}
                  </h3>
                  <p className="text-[11.5px] text-brown-medium leading-relaxed font-light line-clamp-4 pt-1 break-keep">
                    “{work.comment}”
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
                    강의 구경
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
