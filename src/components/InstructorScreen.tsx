import React from 'react';
import { Award, BookOpen, Flame, Heart, Sparkles, MapPin, CheckCircle, ArrowRight, Star } from 'lucide-react';

interface InstructorScreenProps {
  onNavigateToCatalog: () => void;
  onNavigateToBooks: () => void;
}

export default function InstructorScreen({ onNavigateToCatalog, onNavigateToBooks }: InstructorScreenProps) {
  const milestones = [
    { year: '2016', event: '프랑스 파리 L\'École Ritz Escoffier 그랑 디플로마 장학생 졸업' },
    { year: '2018', event: '한남동 디저트 부티크 "Atelier Crème" 설립, 전 제품 조기 완판' },
    { year: '2020', event: '대만 타이베이 & 가오슝 구움과자 마스터 워크숍 전석 매진 (누적 3,000석)' },
    { year: '2022', event: 'Happy Happy Academy 모던 파티세리 디렉팅 라이선스 협업 제휴' },
    { year: '2024', event: 'SBS, MBC 베이킹 트렌드 오너 파티시에 기술 부문 특집 자문 출연' },
    { year: '2025', event: '시그니처 베이킹 가이드북 [아틀리에 크렘의 사계] 베스트셀러 등극' },
  ];

  const philosophies = [
    {
      title: "1mg의 계량, 1℃의 오븐 조율",
      desc: "베이킹은 감이 아닌 정밀 과학입니다. 밀가루 종류의 단백질 비율과 버터의 포화 지방산 융점까지 계산하여 초보자도 100% 동일한 고급 구움을 빚어낼 수 있는 정밀 지표를 제시합니다."
    },
    {
      title: "상업적 원가 구조와 공정 단축",
      desc: "취미에만 머무르는 홈쿠킹이 아닙니다. 매장 가동 효율을 극대화하기 위해 미리 생지를 휴지하고, 엑셀 스마트 단가 배합 양식을 적용해 공정을 최대 50% 줄이는 현업 창업 솔루션을 이식합니다."
    },
    {
      title: "세련된 에디토리얼 비주얼",
      desc: "보기 좋은 디저트가 가장 달콤합니다. 플레이팅, 조명 반사, 패키징 리본을 묶는 디테일 하나까지도 하나의 고급 스튜디오 작품처럼 연출하는 디자인 감각을 공유합니다."
    }
  ];

  const qaList = [
    {
      q: "혼자서 전 클래스와 도서 제작, 수강생 피드백까지 운영하는 이유가 있나요?",
      a: "수년간 직영 디저트 부티크를 운영하며 가장 크게 깨달은 것은 ‘기술의 무결성’이었습니다. 여러 명의 강사진이 나누어 설명하다 보면 머랭의 빳빳함과 믹싱 회수에 관한 설명에 불일치가 일어나고 수강생의 결과물이 들쭉날쭉해집니다. 저는 계량부터 오븐 투이, 1:1 질문 피드백까지 제 이름을 걸고 직접 올바른 기준을 전달하고자 1인 마스터 체제를 엄격하게 전개하고 있습니다."
    },
    {
      q: "이전에 베이킹에 실패했던 사람들도 구제받을 수 있을까요?",
      a: "그럼요. 실패하는 가장 큰 요인은 보통 ‘설명이 생략된 텍스처 전이 단계’에 있습니다. 레시피 북에 ‘버터가 윤기 날 때까지 저어라’고 써 있으면, 초보자는 그 윤기가 60% 윤기인지 90% 윤기인지 파악하기 어렵기 때문이죠. 저는 초근접 4K 오토포커싱 촬영 기법으로 완벽한 촉촉함의 마지노선을 눈앞에 선명히 증명해 드림으로써 오독과 실수를 차단해 버립니다."
    }
  ];

  return (
    <div id="instructor-screen" className="bg-[#FAF4EA] min-h-screen text-[#2A211B] font-sans selection:bg-[#B65538]/20 selection:text-[#B65538]">
      
      {/* Editorial Mini Hero */}
      <section className="relative pt-6 sm:pt-10 lg:pt-12 pb-16 sm:pb-20 px-4 sm:px-12 max-w-7xl mx-auto border-b border-[#EFE8DC]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Side: Chef Elegant Portrait Frame */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-[340px] sm:max-w-[380px]">
              {/* Background solid framing */}
              <div className="absolute inset-4 bg-[#B0863C]/10 rounded-2xl transform rotate-3 -z-10" />
              
              <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-white transform -rotate-1 hover:rotate-0 transition-transform duration-500">
                <img 
                  referrerPolicy="no-referrer"
                  src="https://images.unsplash.com/photo-1581299894007-aaa50297cf16?auto=format&fit=crop&q=80&w=600" 
                  alt="Chef Sohee Min" 
                  className="w-full h-full object-cover filter brightness-[0.98]"
                />
              </div>

              {/* Signature badge overlay */}
              <div className="absolute -bottom-6 -right-6 bg-white p-5 rounded-xl shadow-xl border border-[#EFE8DC]/80 max-w-[190px]">
                <p className="text-[10px] text-[#B0863C] font-semibold tracking-wider uppercase">Directing Chef</p>
                <h4 className="font-serif text-base font-bold text-[#2A211B] mt-0.5">민소희 (Sohee Min)</h4>
                <p className="text-[10px] text-[#5F4E43] font-light leading-relaxed mt-1">
                  Atelier Crème 대표 디렉터 겸 파티시에
                </p>
              </div>
            </div>
          </div>

          {/* Right Side: Philosophy & Bio Text */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B65538]/8 text-[#B65538] text-[11px] font-bold tracking-wider uppercase border border-[#B65538]/15 shadow-sm">
              <Sparkles size={12} className="text-[#B65538]" />
              ATELIER OWNER CHEF PHILOSOPHY
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#2A211B] leading-tight keep-all break-keep">
              소수가 탐닉하는 맛을, 모두의 교과서로 <span className="font-serif italic text-[#B65538]">구현하다</span>
            </h1>

            <p className="text-sm sm:text-base text-[#5F4E43] font-light leading-relaxed keep-all break-keep space-y-4">
              <span>안녕하세요, 아틀리에 크렘의 헤드 오너 셰프 <strong>민소희</strong>입니다.</span>
              <span className="block mt-3">스튜디오를 운영하며 전국은 물론 해외 대만, 싱가포르에서도 왕복 비행기를 끊어 오시는 수강생분들을 마주하며 깊은 울림을 받았습니다. 오프라인 강연은 장소의 한계로 소수의 예약자만 그 깊이를 나눠 가질 수 있었습니다.</span>
              <span className="block mt-3">보다 많은 홈베이커와 꿈나무 오너분들께 파리의 프렌치 고전 테크닉부터 매장 판매율을 치솟게 만드는 리얼 상업용 원가 배합 노하우를 완전하게 전수하고자, 제가 직접 레시피 전 기틀을 아카이브 VOD와 책으로 집대성했습니다. <strong>정확히 통제할 줄 안다면, 당신의 오븐은 가장 영리한 파티세리가 될 것입니다.</strong></span>
            </p>

            {/* Quick interactive stats */}
            <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-[#EFE8DC] max-w-lg">
              <div>
                <p className="text-2xl font-serif font-extrabold text-[#B65538]">10,500+</p>
                <p className="text-[10.5px] text-[#5F4E43] font-light mt-0.5">누적 지도 수강생 수</p>
              </div>
              <div>
                <p className="text-2xl font-serif font-extrabold text-[#B0863C]">100%</p>
                <p className="text-[10.5px] text-[#5F4E43] font-light mt-0.5">자체 기획 오리지널 레시피</p>
              </div>
              <div>
                <p className="text-2xl font-serif font-extrabold text-[#2A211B]">1:1</p>
                <p className="text-[10.5px] text-[#5F4E43] font-light mt-0.5">마스터 독점 피드백 답변</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onNavigateToCatalog}
                className="px-6 py-3 bg-[#2A211B] hover:bg-[#B65538] text-white text-xs font-bold rounded-xl shadow-md transition-all duration-300"
              >
                셰프의 클래스 감상하기
              </button>
              <button
                onClick={onNavigateToBooks}
                className="px-6 py-3 bg-white border border-[#EFE8DC] hover:bg-[#FAF4EA] text-[#5F4E43] text-xs font-semibold rounded-xl transition-all"
              >
                저서 단행본 구경하기
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* Philosophy Details Section */}
      <section className="py-20 px-6 sm:px-12 max-w-7xl mx-auto border-b border-[#EFE8DC]/70">
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
          <span className="text-xs font-serif font-bold text-[#B0863C] tracking-[0.2em] uppercase">THE Core Values</span>
          <h2 className="font-serif text-3xl font-bold text-[#2A211B]">민소희 마스터의 3대 집필 원칙</h2>
          <p className="text-xs sm:text-sm text-[#5F4E43] font-light">오프라인 클래스 5시간을 책 한 권, 강의 한 세션으로 담기 위해 타협 없는 깊이만을 고집합니다.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {philosophies.map((phil, i) => (
            <div key={i} className="bg-white rounded-2xl p-8 border border-[#EFE8DC] space-y-4 hover:shadow-lg transition-transform duration-300">
              <div className="w-10 h-10 rounded-full bg-[#B65538]/10 text-[#B65538] flex items-center justify-center font-bold font-serif">
                0{i + 1}
              </div>
              <h3 className="font-serif text-lg font-bold text-[#2A211B]">{phil.title}</h3>
              <p className="text-xs sm:text-[13px] text-[#5F4E43] leading-relaxed font-light">{phil.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Chef Milestones & Careers Timeline */}
      <section className="py-20 px-6 sm:px-12 bg-white/60">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-3 mb-16">
            <Award className="mx-auto text-[#B0863C] animate-pulse" size={28} />
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2A211B]">발자취 & 히스토리</h2>
            <p className="text-xs text-[#5F4E43] font-light">엄격한 트레이닝과 가감 없는 집념이 가꾸어낸 아틀리에 크렘의 연대기입니다.</p>
          </div>

          <div className="relative border-l border-[#B0863C]/30 pl-6 sm:pl-8 space-y-10 py-2">
            {milestones.map((ms, index) => (
              <div key={index} className="relative group">
                {/* Dots indicator */}
                <span className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full bg-[#B0863C] border-4 border-white shadow-md group-hover:bg-[#B65538] transition-colors" />
                
                <div className="space-y-1">
                  <span className="font-mono text-sm font-bold text-[#B1863C] block">{ms.year}</span>
                  <p className="text-sm font-serif font-medium text-[#2A211B] sm:text-base leading-relaxed">{ms.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interview / Deep QA Dialogue Section */}
      <section className="py-20 px-6 sm:px-12 bg-white/80 border-t border-[#EFE8DC]">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="text-center space-y-2 mb-12">
            <span className="text-[10px] bg-[#2A211B] text-white px-3 py-1 rounded font-bold tracking-widest uppercase">Deep Interview</span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2A211B]">수강생들이 가장 궁금해했던 셰프에 대한 인터뷰</h2>
            <p className="text-xs text-[#5F4E43] font-light">Atelier Crème 1인 브랜드 철학과 베이킹 연구실 비하인드 스토리를 전해드립니다.</p>
          </div>

          {qaList.map((qa, index) => (
            <div key={index} className="space-y-4 border-b border-[#FAF4EA] pb-8 last:border-none">
              <div className="flex items-start gap-3">
                <span className="font-serif text-lg font-extrabold text-[#B65538] shrink-0 mt-0.5">Q.</span>
                <h4 className="font-serif text-base sm:text-lg font-bold text-[#2A211B]">{qa.q}</h4>
              </div>
              <div className="flex items-start gap-3 pl-2 sm:pl-4 border-l-2 border-[#B0863C]/20 bg-[#FAF4EA]/40 p-4 rounded-xl">
                <span className="font-serif text-xs font-semibold text-stone-400 shrink-0 mt-1 uppercase">ANSWER :</span>
                <p className="text-[#5F4E43] text-sm font-light leading-relaxed">{qa.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA board for Sohee Min */}
      <section className="py-16 bg-[#2A211B] text-[#FAF4EA] text-center px-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-full bg-[#FAF4EA]/10 mx-auto flex items-center justify-center text-[#B0863C] border border-[#B0863C]/30 text-xl font-serif font-bold">
            MC
          </div>
          <h3 className="font-serif text-2xl sm:text-3xl font-bold keep-all break-keep">
            "실패하지 않는 지혜를 당신에게 기꺼이 바칩니다"
          </h3>
          <p className="text-xs sm:text-sm text-white/70 font-light leading-relaxed keep-all break-keep">
            프랑스 파리의 깊이감과 가치 있는 황금 배합비를 아카이브에 영구 저장해 두고 가보처럼 대대로 꺼내 보세요. 수강 및 레시피 수정에 대한 전 과정은 셰프인 제가 직접 대행 전담합니다.
          </p>
          
          <div className="flex justify-center gap-3 pt-4">
            <button
              onClick={onNavigateToCatalog}
              className="px-6 py-2.5 bg-[#B65538] hover:bg-[#A0452C] text-[#FAF4EA] text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
            >
              마스터 클래스 목록보기
            </button>
            <button
              onClick={onNavigateToBooks}
              className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-[#FAF4EA] text-xs font-medium rounded-xl transition-colors cursor-pointer"
            >
              베스트 전용서 판매처로
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
