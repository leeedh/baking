'use client';

import { useRouter } from '@/i18n/navigation';
import { ChevronRight, Clock, PlayCircle, Star } from 'lucide-react';
import type { ClassItem } from '../../types';

interface ClassCardProps {
  cls: ClassItem;
}

// DC-96 · 카탈로그 카드. 홈(베스트 3)·온라인 클래스(전체 그리드) 양쪽에서 재사용한다.
// 클릭 타깃이 제목·버튼 둘이라 <Link> 래핑 대신 router.push를 쓴다(프리페치는 호출부에서 수행).
export default function ClassCard({ cls }: ClassCardProps) {
  const router = useRouter();
  const onNavigateToDetail = () => router.push(`/classes/${cls.id}`);

  const discountPercent = Math.round((1 - cls.price / cls.originalPrice) * 100);
  const monthlyInstallment = Math.round(cls.price / 12);

  return (
    <div
      id={`class-card-${cls.id}`}
      className="bg-white rounded-2xl border border-brown-light overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col group"
    >
      {/* Image wrapper with high detail animation */}
      <div className="relative aspect-[16/10] overflow-hidden bg-cream">
        <img
          referrerPolicy="no-referrer"
          src={cls.thumbnail}
          alt={cls.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter brightness-[0.97]"
        />

        {/* Dark gradient vignette edge */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-60 pointer-events-none" />

        {/* Left Category Badge Overlays */}
        <span className="absolute top-3 left-3 bg-brown/90 backdrop-blur-md text-cream text-[10px] font-semibold px-2.5 py-1 rounded-lg tracking-wider border border-white/5 uppercase">
          {cls.category}
        </span>

        {/* Right Ownership/Discount Overlays */}
        <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
          <span className="bg-terracotta text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full tracking-wider uppercase shadow-md">
            평생 소장 VOD
          </span>
          {discountPercent > 0 && (
            <span className="bg-gold text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-sm">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {/* FREE PREVIEW FLOATING ACCENT BOARD */}
        <span className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md text-brown text-[10px] font-semibold px-2.5 py-1.5 rounded-lg shadow-lg border border-brown-light/80 flex items-center gap-1.5">
          <PlayCircle size={13} className="text-terracotta animate-pulse" />
          <span>1차시 무료 즉시 보기 포함</span>
        </span>

        {/* Students total counter */}
        <span className="absolute bottom-3 right-3 bg-brown/65 backdrop-blur text-white text-[9px] px-2 py-1 rounded">
          누적 {cls.studentsCount.toLocaleString()}명 수강
        </span>
      </div>

      {/* Card Main Editorial Content */}
      <div className="p-6 flex-grow flex flex-col justify-between space-y-6">
        <div className="space-y-3">
          {/* Instructor detailed profile header */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gold">{cls.instructor}</span>
            <span className="text-[10px] text-brown-medium/45">|</span>
            <span className="text-[10px] text-brown-medium/90 font-light truncate max-w-[190px]">
              {cls.instructorTitle}
            </span>
          </div>

          {/* Title: High serif, line limit */}
          <h3
            onClick={onNavigateToDetail}
            className="font-serif text-[17px] sm:text-[18px] font-bold text-brown line-clamp-2 hover:text-terracotta cursor-pointer transition-colors leading-snug"
          >
            {cls.title}
          </h3>

          {/* Multi metrics badges bar */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="flex items-center gap-1 text-[11px] font-bold text-gold bg-gold/6 px-2 py-1 rounded-md">
              <Star size={11} className="fill-gold" />
              <span>{cls.rating.toFixed(1)}</span>
              <span className="text-[10px] text-brown-medium/60 font-medium">
                ({cls.reviewCount} 리뷰)
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10.5px] text-brown-medium font-light bg-cream px-2 py-1 rounded-md">
              <Clock size={11} />
              <span>{cls.duration}</span>
            </div>
            <div className="text-[10.5px] text-terracotta font-semibold bg-terracotta/6 px-2 py-1 rounded-md border border-terracotta/10">
              {cls.level}마스터
            </div>
          </div>

          {/* Detail overview text excerpt */}
          <p className="text-xs text-brown-medium/85 font-light leading-relaxed line-clamp-2">
            {cls.description}
          </p>

          {/* Class custom highlights flags */}
          <div className="flex flex-wrap gap-1.5 pt-1.5">
            <span className="text-[9.5px] text-brown-medium/80 bg-cream rounded-full px-2 py-0.5 border border-brown-light">
              #원가절감 배합
            </span>
            <span className="text-[9.5px] text-brown-medium/80 bg-cream rounded-full px-2 py-0.5 border border-brown-light">
              #밀착 오븐피드백
            </span>
            <span className="text-[9.5px] text-brown-medium/80 bg-cream rounded-full px-2 py-0.5 border border-brown-light">
              #비밀 PDF북
            </span>
          </div>
        </div>

        {/* Price with monthly split indicator */}
        <div className="pt-4 border-t border-brown-light/70 flex items-end justify-between">
          <div className="space-y-0.5">
            {discountPercent > 0 && (
              <span className="block text-[10.5px] text-brown-medium/50 line-through">
                ₩{cls.originalPrice.toLocaleString()}원
              </span>
            )}
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-brown">
                ₩{cls.price.toLocaleString()}
              </span>
              <span className="text-[11px] text-terracotta font-bold">일시불</span>
            </div>
            <span className="text-[10px] text-gold block font-light">
              무이자 12개월 할부 시{' '}
              <strong className="font-bold text-gold">
                월 ₩{monthlyInstallment.toLocaleString()}원
              </strong>
            </span>
          </div>

          <button
            type="button"
            onClick={onNavigateToDetail}
            className="px-4 py-2.5 bg-brown text-white text-[11px] font-bold rounded-xl hover:bg-terracotta transition-all cursor-pointer shadow-sm shadow-brown/10 active:scale-95 flex items-center gap-1"
          >
            <span>마스터 코스 탐색</span>
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
