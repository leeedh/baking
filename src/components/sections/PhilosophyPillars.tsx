'use client';

import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import { Link } from '@/i18n/navigation';
import { buttonClasses } from '@/lib/button-classes';
import { cn } from '@/lib/cn';
import { ChevronRight, FileText, type LucideIcon, MessageSquare, Utensils } from 'lucide-react';
import type { CSSProperties } from 'react';

interface PhilosophyPillarsProps {
  /**
   * DC-96 · 홈(게이트웨이)은 `summary` — 카드 본문을 3줄로 줄이고 소개 페이지로 유도한다.
   * 소개(`/about`)는 `full` — 철학 전문을 그대로 노출한다.
   */
  variant?: 'summary' | 'full';
}

type Pillar = {
  no: string;
  title: string;
  body: string;
  footnote: string;
  Icon: LucideIcon;
  /** 카드별 액센트 — gold → terracotta → brown 순으로 톤이 깊어진다. */
  accent: { badge: string; badgeHover: string; border: string; text: string };
};

const PILLARS: Pillar[] = [
  {
    no: '01',
    title: '실패 원인을 해체하는 영상 가이드',
    body: '머랭의 가벼운 공기 포집부터 오븐 입고 시 기체 이탈 과정, 기후 변화에 따른 습도 보정까지 오직 감각으로 눙치던 현업 장인들의 포인트를 과학적 정량 지표로 알려드립니다.',
    footnote: '습도/기압 최적 세팅 시트',
    Icon: FileText,
    accent: {
      badge: 'bg-gold/10 text-gold',
      badgeHover: 'group-hover:bg-gold group-hover:text-white',
      border: 'hover:border-gold/30',
      text: 'text-gold',
    },
  },
  {
    no: '02',
    title: '원가 산출 및 상업 전용 대량 배합표',
    body: '카페 창업 혹은 스튜디오 클래스를 운영 중이신가요? 100% 실전 판매용으로 구성되어, 고가의 자재 원가를 영리하게 조율하고 공정을 50% 단축시키는 오너 전용 엑셀 배합 마스터 파일이 포함됩니다.',
    footnote: '셰프 사용 밀베이커 엑셀 마스터',
    Icon: Utensils,
    accent: {
      badge: 'bg-terracotta/10 text-terracotta',
      badgeHover: 'group-hover:bg-terracotta group-hover:text-white',
      border: 'hover:border-terracotta/30',
      text: 'text-terracotta',
    },
  },
  {
    no: '03',
    title: '현직 파티시에 오너의 밀착 컨설팅',
    body: '수강 중 결과물이 한쪽으로 치우쳐 나오거나 꼬끄 겉면에 균열이 생긴 경우, 사진과 오븐 온도를 게시판에 올려주시면 세션 마스터가 가입 회원 계정에 직강 맞춤형 코멘트를 수시로 전송해 드립니다.',
    footnote: '1:1 평생 수강생 게시판 피드백 보장',
    Icon: MessageSquare,
    accent: {
      badge: 'bg-brown/10 text-brown',
      badgeHover: 'group-hover:bg-brown group-hover:text-white',
      border: 'hover:border-brown/30',
      text: 'text-brown',
    },
  },
];

export default function PhilosophyPillars({ variant = 'full' }: PhilosophyPillarsProps) {
  const isSummary = variant === 'summary';
  const revealRef = useRevealOnScroll<HTMLDivElement>();

  return (
    <section
      aria-labelledby="philosophy-heading"
      className="py-20 px-6 sm:px-12 bg-white/75 border-b border-brown-light/50"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
          {/* eyebrow는 헤딩이 아니다 — 예전에는 <h2>였고 실제 제목이 <h3>여서 순서가 역전됐다. */}
          <p className="font-serif text-xs font-bold text-gold tracking-[0.25em] uppercase">
            Premium Standard
          </p>
          <h2
            id="philosophy-heading"
            className="font-serif text-3xl sm:text-4xl font-bold text-brown leading-tight break-keep"
          >
            일반 베이킹 강의들과 극명하게 대비되는{' '}
            <span className="font-serif italic text-terracotta">차이점</span>
          </h2>
          <p className="text-sm text-brown-medium font-light break-keep">
            단순히 레시피 받아쓰기 교육으로는 매장 경쟁력을 높이거나 감탄사를 만들어내는 텍스처를
            빚어낼 수 없습니다. 프로들의 노하우를 가장 완벽하게 전달합니다.
          </p>
        </div>

        <div ref={revealRef} className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
          {PILLARS.map((pillar, i) => (
            <div
              key={pillar.no}
              data-reveal-init
              style={{ '--reveal-delay': `${i * 90}ms` } as CSSProperties}
              className={cn(
                'p-8 bg-cream/40 rounded-2xl border border-brown-light/65 space-y-4 group',
                'transition-[background-color,border-color,box-shadow] duration-300 ease-out-soft hover:bg-cream/70 hover:shadow-card-hover',
                pillar.accent.border,
              )}
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center font-serif text-lg font-bold transition-all duration-300 ease-out-soft',
                  pillar.accent.badge,
                  pillar.accent.badgeHover,
                )}
              >
                {pillar.no}
              </div>
              <h3 className="font-serif text-xl font-bold text-brown break-keep">{pillar.title}</h3>
              <p
                className={cn(
                  'text-xs sm:text-[13px] text-brown-medium leading-relaxed font-light break-keep',
                  isSummary && 'line-clamp-3',
                )}
              >
                {pillar.body}
              </p>
              <div
                className={cn(
                  'pt-2 flex items-center gap-1.5 text-xs font-semibold',
                  pillar.accent.text,
                )}
              >
                <pillar.Icon size={14} />
                <span>{pillar.footnote}</span>
              </div>
            </div>
          ))}
        </div>

        {isSummary && (
          <div className="mt-12 text-center">
            <Link href="/about" className={buttonClasses('outline')}>
              <span>브랜드 철학 전문 보기</span>
              <ChevronRight size={13} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
