'use client';

import Button from '@/components/ui/Button';
import { useRouter } from '@/i18n/navigation';
import { ChevronRight, Clock, PlayCircle, Star } from 'lucide-react';
import Image from 'next/image';
import { useTransition } from 'react';
import type { ClassItem } from '../../types';

interface ClassCardProps {
  cls: ClassItem;
}

const HIGHLIGHTS = ['#원가절감 배합', '#밀착 오븐피드백', '#비밀 PDF북'];

// DC-96 · 카탈로그 카드. 홈(베스트 3)·온라인 클래스(전체 그리드) 양쪽에서 재사용한다.
// 클릭 타깃이 제목·버튼 둘이라 <Link> 래핑 대신 router.push를 쓴다(프리페치는 호출부에서 수행).
export default function ClassCard({ cls }: ClassCardProps) {
  const router = useRouter();
  // 라우트 전환에 즉각 반응이 없어 클릭이 씹힌 것처럼 보였다 — CTA에 진행 상태를 붙인다.
  const [isPending, startTransition] = useTransition();
  const onNavigateToDetail = () => {
    startTransition(() => router.push(`/classes/${cls.id}`));
  };

  const discountPercent = Math.round((1 - cls.price / cls.originalPrice) * 100);
  const monthlyInstallment = Math.round(cls.price / 12);

  return (
    <div
      id={`class-card-${cls.id}`}
      className="@container bg-white rounded-card border border-brown-light overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-[box-shadow,transform] duration-300 ease-out-soft flex flex-col group"
    >
      {/* Image wrapper with high detail animation */}
      <div className="relative aspect-[16/10] overflow-hidden bg-cream">
        <Image
          referrerPolicy="no-referrer"
          src={cls.thumbnail}
          alt={cls.title}
          fill
          // 1열(모바일) → 4열(xl)까지의 실제 렌더 폭. 과도한 원본 다운로드를 막는다.
          sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out-soft filter brightness-[0.97]"
        />

        {/* Dark gradient vignette edge */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />

        {/* Left Category Badge Overlays */}
        <span className="absolute top-3 left-3 bg-brown/90 backdrop-blur-md text-cream text-[11px] font-semibold px-2.5 py-1 rounded-lg tracking-wider border border-white/5 uppercase">
          {cls.category}
        </span>

        {/* Right Ownership/Discount Overlays */}
        <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
          <span className="bg-terracotta text-white text-[11px] font-extrabold px-2 py-0.5 rounded-full tracking-wider uppercase shadow-card">
            평생 소장 VOD
          </span>
          {discountPercent > 0 && (
            <span className="bg-gold text-white text-[11px] font-extrabold px-1.5 py-0.5 rounded shadow-card">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {/*
         * 하단 오버레이는 좁은 폭(320px)에서 좌우 배지가 서로 겹쳤다.
         * 이제 한 줄의 flex 바에 담아 gap과 truncate로 충돌을 막는다.
         */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <span className="min-w-0 bg-white/95 backdrop-blur-md text-brown text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-card border border-brown-light/80 flex items-center gap-1.5">
            <PlayCircle size={13} className="shrink-0 text-terracotta" />
            <span className="truncate">1차시 무료 즉시 보기 포함</span>
          </span>

          <span className="shrink-0 bg-brown/70 backdrop-blur text-white text-[11px] px-2 py-1 rounded whitespace-nowrap">
            누적 {cls.studentsCount.toLocaleString()}명
          </span>
        </div>
      </div>

      {/* Card Main Editorial Content */}
      <div className="p-4 @[20rem]:p-6 flex-grow flex flex-col justify-between space-y-6">
        <div className="space-y-3">
          {/* Instructor detailed profile header */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-gold shrink-0">{cls.instructor}</span>
            <span className="text-[11px] text-brown-medium/50" aria-hidden>
              |
            </span>
            <span className="text-[11px] text-brown-medium font-light truncate">
              {cls.instructorTitle}
            </span>
          </div>

          {/* Title: High serif, line limit. 버튼으로 감싸 키보드로도 도달한다. */}
          <h3 className="font-serif text-[17px] sm:text-[18px] font-bold leading-snug">
            <button
              type="button"
              onClick={onNavigateToDetail}
              className="text-left text-brown line-clamp-2 hover:text-terracotta transition-colors cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {cls.title}
            </button>
          </h3>

          {/* Multi metrics badges bar */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="flex items-center gap-1 text-[11px] font-bold text-gold bg-gold/10 px-2 py-1 rounded-md">
              <Star size={11} className="fill-gold" />
              <span>{cls.rating.toFixed(1)}</span>
              <span className="text-[11px] text-brown-medium/80 font-medium">
                ({cls.reviewCount} 리뷰)
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-brown-medium font-light bg-cream px-2 py-1 rounded-md">
              <Clock size={11} />
              <span>{cls.duration}</span>
            </div>
            <div className="text-[11px] text-terracotta font-semibold bg-terracotta/6 px-2 py-1 rounded-md border border-terracotta/10">
              {cls.level}마스터
            </div>
          </div>

          {/* Detail overview text excerpt */}
          <p className="text-xs text-brown-medium font-light leading-relaxed line-clamp-2 break-keep">
            {cls.description}
          </p>

          {/* Class custom highlights flags */}
          <div className="flex flex-wrap gap-1.5 pt-1.5">
            {HIGHLIGHTS.map((tag) => (
              <span
                key={tag}
                className="text-[11px] text-brown-medium bg-cream rounded-full px-2 py-0.5 border border-brown-light"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Price with monthly split indicator — 좁은 폭에서는 CTA를 아래로 내린다. */}
        <div className="pt-4 border-t border-brown-light/70 flex flex-col @[20rem]:flex-row @[20rem]:items-end @[20rem]:justify-between gap-3">
          <div className="space-y-0.5">
            {discountPercent > 0 && (
              <span className="block text-[11px] text-brown-medium/70 line-through">
                ₩{cls.originalPrice.toLocaleString()}원
              </span>
            )}
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-brown">₩{cls.price.toLocaleString()}</span>
              <span className="text-[11px] text-terracotta font-bold">일시불</span>
            </div>
            <span className="text-[11px] text-gold block font-light">
              무이자 12개월 할부 시{' '}
              <strong className="font-bold text-gold">
                월 ₩{monthlyInstallment.toLocaleString()}원
              </strong>
            </span>
          </div>

          <Button
            onClick={onNavigateToDetail}
            loading={isPending}
            className="w-full @[20rem]:w-auto shrink-0"
          >
            <span>마스터 코스 탐색</span>
            {!isPending && <ChevronRight size={12} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
