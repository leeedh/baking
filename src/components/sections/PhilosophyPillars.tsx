'use client';

import { Link } from '@/i18n/navigation';
import { ChevronRight, FileText, MessageSquare, Utensils } from 'lucide-react';

interface PhilosophyPillarsProps {
  /**
   * DC-96 · 홈(게이트웨이)은 `summary` — 카드 본문을 3줄로 줄이고 소개 페이지로 유도한다.
   * 소개(`/about`)는 `full` — 철학 전문을 그대로 노출한다.
   */
  variant?: 'summary' | 'full';
}

export default function PhilosophyPillars({ variant = 'full' }: PhilosophyPillarsProps) {
  const isSummary = variant === 'summary';
  const bodyClass = `text-xs sm:text-[13px] text-[#5F4E43] leading-relaxed font-light${
    isSummary ? ' line-clamp-3' : ''
  }`;

  return (
    <section className="py-20 px-6 sm:px-12 bg-white/75 border-b border-[#EFE8DC]/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
          <h2 className="font-serif text-xs font-bold text-[#B0863C] tracking-[0.25em] uppercase">
            Premium Standard
          </h2>
          <h3 className="font-serif text-3xl sm:text-4xl font-bold text-[#2A211B] leading-tight keep-all break-keep">
            일반 베이킹 강의들과 극명하게 대비되는{' '}
            <span className="font-serif italic text-[#B65538]">차이점</span>
          </h3>
          <p className="text-sm text-[#5F4E43]/90 font-light keep-all break-keep">
            단순히 레시피 받아쓰기 교육으로는 매장 경쟁력을 높이거나 감탄사를 만들어내는 텍스처를
            빚어낼 수 없습니다. 프로들의 노하우를 가장 완벽하게 전달합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
          {/* Box 1 */}
          <div className="p-8 bg-[#FAF4EA]/40 rounded-2xl border border-[#EFE8DC]/65 hover:border-[#B0863C]/30 hover:bg-[#FAF4EA]/70 transition-all duration-300 space-y-4 group">
            <div className="w-12 h-12 rounded-xl bg-[#B0863C]/10 text-[#B0863C] flex items-center justify-center font-serif text-lg font-bold group-hover:bg-[#B1863C] group-hover:text-white transition-all">
              01
            </div>
            <h4 className="font-serif text-xl font-bold text-[#2A211B]">
              실패 원인을 해체하는 영상 가이드
            </h4>
            <p className={bodyClass}>
              머랭의 가벼운 공기 포집부터 오븐 입고 시 기체 이탈 과정, 기후 변화에 따른 습도 보정까지
              오직 감각으로 눙치던 현업 장인들의 포인트를 과학적 정량 지표로 알려드립니다.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-xs text-[#B0863C] font-semibold">
              <FileText size={14} />
              <span>습도/기압 최적 세팅 시트</span>
            </div>
          </div>

          {/* Box 2 */}
          <div className="p-8 bg-[#FAF4EA]/40 rounded-2xl border border-[#EFE8DC]/65 hover:border-[#B65538]/30 hover:bg-[#FAF4EA]/70 transition-all duration-300 space-y-4 group">
            <div className="w-12 h-12 rounded-xl bg-[#B65538]/10 text-[#B65538] flex items-center justify-center font-serif text-lg font-bold group-hover:bg-[#B65538] group-hover:text-white transition-all">
              02
            </div>
            <h4 className="font-serif text-xl font-bold text-[#2A211B]">
              원가 산출 및 상업 전용 대량 배합표
            </h4>
            <p className={bodyClass}>
              카페 창업 혹은 스튜디오 클래스를 운영 중이신가요? 100% 실전 판매용으로 구성되어, 고가의
              자재 원가를 영리하게 조율하고 공정을 50% 단축시키는 오너 전용 엑셀 배합 마스터 파일이
              포함됩니다.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-xs text-[#B65538] font-semibold">
              <Utensils size={14} />
              <span>셰프 사용 밀베이커 엑셀 마스터</span>
            </div>
          </div>

          {/* Box 3 */}
          <div className="p-8 bg-[#FAF4EA]/40 rounded-2xl border border-[#EFE8DC]/65 hover:border-[#2A211B]/30 hover:bg-[#FAF4EA]/70 transition-all duration-300 space-y-4 group">
            <div className="w-12 h-12 rounded-xl bg-[#2A211B]/10 text-[#2A211B] flex items-center justify-center font-serif text-lg font-bold group-hover:bg-[#2A211B] group-hover:text-white transition-all">
              03
            </div>
            <h4 className="font-serif text-xl font-bold text-[#2A211B]">
              현직 파티시에 오너의 밀착 컨설팅
            </h4>
            <p className={bodyClass}>
              수강 중 결과물이 한쪽으로 치우쳐 나오거나 꼬끄 겉면에 균열이 생긴 경우, 사진과 오븐
              온도를 게시판에 올려주시면 세션 마스터가 가입 회원 계정에 직강 맞춤형 코멘트를 수시로
              전송해 드립니다.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-xs text-[#2A211B] font-semibold">
              <MessageSquare size={14} />
              <span>1:1 평생 수강생 게시판 피드백 보장</span>
            </div>
          </div>
        </div>

        {isSummary && (
          <div className="mt-12 text-center">
            <Link
              href="/about"
              className="inline-flex items-center gap-1 px-6 py-3 bg-white border border-[#EFE8DC] hover:border-[#B65538] hover:text-[#B65538] text-[#5F4E43] text-xs font-semibold rounded-xl transition-all"
            >
              <span>브랜드 철학 전문 보기</span>
              <ChevronRight size={13} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
