'use client';

import { Link } from '@/i18n/navigation';
import { ChevronRight } from 'lucide-react';

// DC-96 · 셰프 배너. 홈 게이트웨이에서 소개(/about)·도서(/books)로 보내는 진입점.
export default function ChefBanner() {
  return (
    <section
      aria-labelledby="chef-heading"
      className="py-20 px-6 sm:px-12 max-w-7xl mx-auto border-b border-brown-light/60"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left: Chef Narrative Intro */}
        <div className="lg:col-span-7 space-y-6">
          <span className="text-[10px] font-bold text-gold tracking-widest uppercase block">
            The Mastermind & Owner
          </span>
          <h2
            id="chef-heading"
            className="font-serif text-3xl sm:text-4xl font-bold text-brown leading-tight break-keep"
          >
            Atelier Crème을 이끄는 1인 아티장 파티시에,{' '}
            <span className="font-serif text-terracotta italic">민소희</span> 입니다.
          </h2>
          <p className="text-sm text-brown-medium font-light leading-relaxed break-keep">
            Atelier Crème은 다른 강사에게 외주를 맡기거나 보조 인력의 복제 기획으로 채워진 공장식
            교육 플랫폼이 아닙니다.
          </p>
          <p className="text-sm text-brown-medium font-light leading-relaxed break-keep">
            파리 <strong>Ritz Escoffier</strong> 졸업 이래로, 한남동 디저트 가판대를 전석 매진으로
            장식했던 모든 레시피의 계량, 머랭 수분 제어 설계, 원가 산출 엑셀 배합 시트 작성 및 1:1
            수강생 질문 해결까지 —{' '}
            <strong>오직 저의 이름 석 자와 오너 책임을 걸고 1인 마스터 체제로 전개합니다.</strong>
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/about"
              className="px-6 py-3 bg-brown hover:bg-terracotta text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1"
            >
              <span>민소희 셰프 철학 & 히스토리 더 알아보기</span>
              <ChevronRight size={13} />
            </Link>

            <Link
              href="/books"
              className="px-6 py-3 bg-white hover:bg-cream text-brown-medium border border-brown-light text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              출간 비밀 레시피 북 구경가기
            </Link>
          </div>
        </div>

        {/* Right: Splendid interactive card */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-brown-light rounded-3xl p-8 relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 max-w-sm mx-auto">
            {/* Gold layout indicator badge */}
            <div className="absolute top-0 right-0 bg-gold text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl tracking-wider">
              1인 직강 보증
            </div>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-cream shadow-md bg-stone-100">
                <img
                  referrerPolicy="no-referrer"
                  src="https://images.unsplash.com/photo-1581299894007-aaa50297cf16?auto=format&fit=crop&q=80&w=300"
                  alt="Chef Min Sohee"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gold bg-gold/10 px-2 py-0.5 rounded">
                  SOLE MASTER PIECE
                </span>
                <h3 className="font-serif text-xl font-bold text-brown">민소희 (Sohee Min)</h3>
                <p className="text-xs text-brown-medium/80 font-medium font-serif italic">
                  Atelier Crème 대표 파티시에
                </p>
              </div>

              <blockquote className="text-xs text-brown-medium/90 italic font-light leading-relaxed bg-cream/50 p-3 rounded-xl border border-brown-light/40">
                “단 한 명만의 완벽한 통제 아래 완성도가 보증된 최상의 레시피만을 오롯이 당신의 주방에
                전달해 드립니다.”
              </blockquote>

              <div className="pt-2 border-t border-cream w-full text-[11px] text-brown-medium flex justify-around font-medium">
                <div>VOD 3개 마스터 코스</div>
                <div>만족도 Rating 4.93/5.0</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
