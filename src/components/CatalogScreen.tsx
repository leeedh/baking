import React, { useState } from 'react';
import { ClassItem } from '../types';
import { useLanguage } from '../LanguageContext';
import MeringueHero from './MeringueHero';
import { 
  Star, 
  PlayCircle, 
  BookOpen, 
  Clock, 
  Award, 
  Search, 
  Sparkles, 
  ChevronDown, 
  Check, 
  ChevronRight, 
  Utensils, 
  Users, 
  MessageSquare,
  HelpCircle,
  FileText,
  Flame,
  BadgeAlert
} from 'lucide-react';

interface CatalogScreenProps {
  classes: ClassItem[];
  onSelectClass: (id: string) => void;
  onNavigateToDetail: (id: string) => void;
  onNavigateToInstructor?: () => void;
  onNavigateToBooks?: () => void;
}

export default function CatalogScreen({ 
  classes, 
  onSelectClass, 
  onNavigateToDetail,
  onNavigateToInstructor,
  onNavigateToBooks
}: CatalogScreenProps) {
  const { t, language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [searchQuery, setSearchQuery] = useState('');

  // Baking DNA Matches Quiz State
  const [quizStep, setQuizStep] = useState(1);
  const [quizLevel, setQuizLevel] = useState<string | null>(null);
  const [quizFlavor, setQuizFlavor] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<ClassItem | null>(null);

  // Student Baking Archive Active Tab
  const [activeArchiveCategory, setActiveArchiveCategory] = useState('All');

  // FAQ Accordion Toggle States
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const categories = ['All', '정통 프렌치 디저트', '클래식 구움과자', '모던 타르트'];

  const filteredClasses = classes.filter(cls => {
    const matchesCategory = selectedCategory === 'All' || cls.category === selectedCategory;
    const matchesSearch = cls.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          cls.instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          cls.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Interactive Quiz recommendation logic
  const handleQuizAnswer = (step: number, answer: string) => {
    if (step === 1) {
      setQuizLevel(answer);
      setQuizStep(2);
    } else if (step === 2) {
      setQuizFlavor(answer);
      
      // Select exact matched class
      let matched: ClassItem | undefined;
      if (answer === 'french' || quizLevel === 'expert') {
        // High difficulty -> Tart or Macaron
        matched = classes.find(c => c.id === 'class-tart') || classes[0];
      } else if (answer === 'butter') {
        // Butter focus -> Cookies
        matched = classes.find(c => c.id === 'class-cookies') || classes[0];
      } else {
        matched = classes.find(c => c.id === 'class-macarons') || classes[0];
      }
      
      setQuizResult(matched);
      setQuizStep(3);
    }
  };

  const resetQuiz = () => {
    setQuizStep(1);
    setQuizLevel(null);
    setQuizFlavor(null);
    setQuizResult(null);
  };

  // Mock Student Baked Masterpieces Data
  const studentWorks = [
    {
      id: 'sw-1',
      title: '로즈골드 빛 카라멜 오리지널 마들렌',
      studentName: '최지원 수강생',
      classTitle: '카라멜 테라코타 구움과자 클래스',
      classNameId: 'class-cookies',
      comment: '탄 버터 온도를 정확하게 시각적으로 비교해 주는 덕분에 생전 처음으로 배꼽이 예쁘게 올라오고 버터 풍미 가득한 마들렌이 상업 오븐 없이도 완벽하게 완성됐어요!',
      imageUrl: 'https://images.unsplash.com/photo-1511018556340-d16986a1c194?auto=format&fit=crop&q=80&w=600',
      tag: '클래식 구움과자'
    },
    {
      id: 'sw-2',
      title: '영롱한 할로우 프리 꼬끄 & 무화과 가나슈 마카롱',
      studentName: '이지연 수강생',
      classTitle: '피에르 마카롱 마스터 클래스',
      classNameId: 'class-macarons',
      comment: '동영상 일시정지 해가며 습도 분석을 고수했더니, 그동안 골머리 썩히던 마카로나쥬 꼬끄 과건조나 오븐 불균형 구정이 드디어 정복됐어요. 대만족!',
      imageUrl: 'https://images.unsplash.com/photo-1558961309-dbdf71799f14?auto=format&fit=crop&q=80&w=600',
      tag: '정통 프렌치 디저트'
    },
    {
      id: 'sw-3',
      title: '계절 과일 가득 사블레 파트 생또노레',
      studentName: 'Marcia Liu (대만 수강생)',
      classTitle: '타르트 에디토리얼 마르탱 클래스',
      classNameId: 'class-tart',
      comment: '폰사주 과정이 가이드라인 덕에 매우 단단하게 완성되어 구워도 무너지지 않았습니다! 크레뫼 바닐라 크림의 고급스러운 맛은 단연 현지 디저트 숍 이상입니다.',
      imageUrl: 'https://images.unsplash.com/photo-1464305795204-6f5bdf7f8141?auto=format&fit=crop&q=80&w=600',
      tag: '모던 타르트'
    },
    {
      id: 'sw-4',
      title: '쫀득함이 살아있는 골든 피스톤 쿠키 컬렉션',
      studentName: '황시현 카페 대표',
      classTitle: '카라멜 테라코타 구움과자 클래스',
      classNameId: 'class-cookies',
      comment: '구움과자 라인에 솔티드 오리지널 쿠키를 추가하자마자 매장 배달 및 현장 판매량이 150% 가량 수직 신장했습니다. 원가 계산 전용 PDF 엑셀이 아주 요긴했어요.',
      imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&q=80&w=600',
      tag: '클래식 구움과자'
    },
  ];

  const filteredStudentWorks = studentWorks.filter(work => {
    return activeArchiveCategory === 'All' || work.tag === activeArchiveCategory;
  });

  const faqs = [
    {
      q: "베이킹이 아예 처음인 왕초보인데 전문가용 클래스를 따라갈 수 있을까요?",
      a: "네, Atelier Crème의 클래스는 밀리그램(mg) 단위의 계량부터 반죽의 질감, 실시간 오븐 내부의 팽창 순간까지 하이엔드 접사 카메라로 밀착 촬영되어 제공됩니다. 초보자분들이 가장 많이 하시는 계수 실수와 도구 오염 방지 가이드를 1차시 무료 VOD로 먼저 맛보실 수 있습니다."
    },
    {
      q: "해외(대만/일본 등) 수강생을 위한 자막이나 글로벌 수강 환경이 지원되나요?",
      a: "네, 모든 VOD 강의는 다국어 전문 번역가의 감수를 거쳐 한국어 자막, 중국어 번역 자막이 오차가 발생하지 않도록 100% 동기화 개발되어 있습니다. 자막 제어 기능을 통해 기기 상관없이 아주 매끄럽게 학습하실 수 있습니다."
    },
    {
      q: "구매한 클래스의 레시피 북(PDF)이나 원가 분석표 배합표 양식도 주어지나요?",
      a: "물론입니다. 클래스를 소장하시는 즉시, 각 오너 파티시에가 현업 매장과 브랜드 컨설팅 시 사용하는 상업용 비밀 레시피 북 PDF 파일과 재료 단가 산출 전용 엑셀 마스터 템플릿 파일이 수강 자료실에서 평생 기한 없이 제한 없이 다운로드 제공됩니다."
    },
    {
      q: "구독형 교육 플랫폼과 다른 단건 VOD 평생 소장의 이점은 무엇인가요?",
      a: "매달 주기적으로 자동 결제되어 수백만 원 대의 미수강 부채감을 주는 구독 사이트들과 다르게, 평생 소장은 단 한 번 구매로 가입하신 ID에 수강권이 ‘영구 동기화’됩니다. 원하는 제빵 시즌이나 카페 신메뉴 오픈 주기에 맞춰 5년, 10년 후에도 기한 없이 꺼내 보실 수 있습니다."
    }
  ];

  return (
    <div id="catalog-screen" className="bg-[#FDFBF7] min-h-screen text-[#2A211B] font-sans selection:bg-[#B65538]/20 selection:text-[#B65538]">
      
      {/* Dynamic Announcement Line Bar */}
      <div className="bg-[#2A211B] text-[#FAF4EA] text-xs py-2 px-4 shadow-sm border-b border-[#FAF4EA]/15 overflow-hidden">
        <div id="announcement-scroll" className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-[#B65538] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-widest uppercase">PROMO</span>
            <span className="text-[11px] font-light tracking-wide">Sugar Lane & Happy Happy Academy 콜라보 레퍼런스 오픈 기념 최대 45% 즉시 할인</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[10px] text-white/70">
            <span>• 오너 셰프 1:1 디렉션 보증</span>
            <span>• 실전 상업용 황금 배합비 PDF 즉시 배포</span>
          </div>
        </div>
      </div>

      {/* 1. EDITORIAL BRAND HERO BANNER WITH SCROLL-ACTIVATED MERINGUE CREAM MASKING */}
      <MeringueHero searchQuery={searchQuery} setSearchQuery={setSearchQuery} />


      {/* 2. THE THREE PILLARS PHILOSOPHY (Sugar Lane & Happy Happy Academy references) */}
      <section className="py-20 px-6 sm:px-12 bg-white/75 border-b border-[#EFE8DC]/50">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <h2 className="font-serif text-xs font-bold text-[#B0863C] tracking-[0.25em] uppercase">Premium Standard</h2>
            <h3 className="font-serif text-3xl sm:text-4xl font-bold text-[#2A211B] leading-tight keep-all break-keep">
              일반 베이킹 강의들과 극명하게 대비되는 <span className="font-serif italic text-[#B65538]">차이점</span>
            </h3>
            <p className="text-sm text-[#5F4E43]/90 font-light keep-all break-keep">
              단순히 레시피 받아쓰기 교육으로는 매장 경쟁력을 높이거나 감탄사를 만들어내는 텍스처를 빚어낼 수 없습니다. 프로들의 노하우를 가장 완벽하게 전달합니다.
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
              <p className="text-xs sm:text-[13px] text-[#5F4E43] leading-relaxed font-light">
                머랭의 가벼운 공기 포집부터 오븐 입고 시 기체 이탈 과정, 기후 변화에 따른 습도 보정까지 오직 감각으로 눙치던 현업 장인들의 포인트를 과학적 정량 지표로 알려드립니다.
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
              <p className="text-xs sm:text-[13px] text-[#5F4E43] leading-relaxed font-light">
                카페 창업 혹은 스튜디오 클래스를 운영 중이신가요? 100% 실전 판매용으로 구성되어, 고가의 자재 원가를 영리하게 조율하고 공정을 50% 단축시키는 오너 전용 엑셀 배합 마스터 파일이 포함됩니다.
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
              <p className="text-xs sm:text-[13px] text-[#5F4E43] leading-relaxed font-light">
                수강 중 결과물이 한쪽으로 치우쳐 나오거나 꼬끄 겉면에 균열이 생긴 경우, 사진과 오븐 온도를 게시판에 올려주시면 세션 마스터가 가입 회원 계정에 직강 맞춤형 코멘트를 수시로 전송해 드립니다.
              </p>
              <div className="pt-2 flex items-center gap-1.5 text-xs text-[#2A211B] font-semibold">
                <MessageSquare size={14} />
                <span>1:1 평생 수강생 게시판 피드백 보장</span>
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* 3. INTERACTIVE QUIZ DECK: Baking Recipe matchmaking quiz (Very high engagement, mimicking luxury experience) */}
      <section className="py-16 px-6 sm:px-12 bg-[#FAF4EA] border-b border-[#EFE8DC]/80">
        <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-[#EFE8DC] overflow-hidden shadow-xl">
          
          <div className="grid grid-cols-1 md:grid-cols-5">
            {/* Left title section */}
            <div className="md:col-span-2 bg-[#2A211B] text-[#FAF4EA] p-8 sm:p-10 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-[#B0863C] tracking-widest uppercase">{t('quiz.badge')}</span>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold leading-tight keep-all break-keep">
                  {t('quiz.title')}
                </h3>
                <p className="text-xs text-white/70 font-light leading-relaxed keep-all break-keep">
                  {t('quiz.desc')}
                </p>
              </div>

              <div className="pt-8 border-t border-white/10 hidden md:block">
                <p className="text-[10px] text-white/50">Atelier Crème Premium Engine</p>
              </div>
            </div>

            {/* Right Interactive quiz steps holder */}
            <div className="md:col-span-3 p-8 sm:p-10 flex flex-col justify-center">
              
              {quizStep === 1 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-1.5 text-[#B65538]">
                    <span className="text-xs font-bold bg-[#B65538]/10 px-2 py-0.5 rounded">STEP 01</span>
                    <span className="text-xs font-semibold">현재 나의 오븐 숙련도는 어느 쪽인가요?</span>
                  </div>
                  
                  <div className="space-y-3">
                    <button 
                      onClick={() => handleQuizAnswer(1, 'beginner')}
                      className="w-full text-left p-4 rounded-xl border border-[#EFE8DC] hover:border-[#B65538] hover:bg-[#FAF4EA]/50 transition-all font-medium text-sm text-[#2A211B] flex items-center justify-between group"
                    >
                      <span>베이킹 초보 (기초적인 계량과 도구를 배우고 싶어요)</span>
                      <ChevronRight size={14} className="text-[#5F4E43]/40 group-hover:text-[#B65538] transition-colors" />
                    </button>
                    
                    <button 
                      onClick={() => handleQuizAnswer(1, 'hobbyist')}
                      className="w-full text-left p-4 rounded-xl border border-[#EFE8DC] hover:border-[#B65538] hover:bg-[#FAF4EA]/50 transition-all font-medium text-sm text-[#2A211B] flex items-center justify-between group"
                    >
                      <span>디저트 홈베이커 (마카롱, 까눌레 구운 성적이 있고 품질을 높이고 싶어요)</span>
                      <ChevronRight size={14} className="text-[#5F4E43]/40 group-hover:text-[#B65538] transition-colors" />
                    </button>

                    <button 
                      onClick={() => handleQuizAnswer(1, 'expert')}
                      className="w-full text-left p-4 rounded-xl border border-[#EFE8DC] hover:border-[#B65538] hover:bg-[#FAF4EA]/50 transition-all font-medium text-sm text-[#2A211B] flex items-center justify-between group"
                    >
                      <span>현직 파티시에 / 카페 자영업 (원가 세밀 배합과 판매 전개 노하우가 필요합니다)</span>
                      <ChevronRight size={14} className="text-[#5F4E43]/40 group-hover:text-[#B65538] transition-colors" />
                    </button>
                  </div>
                </div>
              )}

              {quizStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-1.5 text-[#B65538]">
                    <span className="text-xs font-bold bg-[#B65538]/10 px-2 py-0.5 rounded">STEP 02</span>
                    <span className="text-xs font-semibold font-medium">추구하시는 베이킹의 풍미와 추구 디자인은 무엇인가요?</span>
                  </div>
                  
                  <div className="space-y-3">
                    <button 
                      onClick={() => handleQuizAnswer(2, 'sweet')}
                      className="w-full text-left p-4 rounded-xl border border-[#EFE8DC] hover:border-[#B65538] hover:bg-[#FAF4EA]/50 transition-all font-medium text-sm text-[#2A211B] flex items-center justify-between group"
                    >
                      <span>밀착 쫀득하고 화려한 달콤함 (정밀한 정통 마카롱과 가나슈 필링)</span>
                      <ChevronRight size={14} className="text-[#5F4E43]/40 group-hover:text-[#B65538] transition-colors" />
                    </button>
                    
                    <button 
                      onClick={() => handleQuizAnswer(2, 'butter')}
                      className="w-full text-left p-4 rounded-xl border border-[#EFE8DC] hover:border-[#B65538] hover:bg-[#FAF4EA]/50 transition-all font-medium text-sm text-[#2A211B] flex items-center justify-between group"
                    >
                      <span>진하고 고소한 구운 구움과자 향 (깊은 탄버터 휘낭시에, 명품 마들렌)</span>
                      <ChevronRight size={14} className="text-[#5F4E43]/40 group-hover:text-[#B65538] transition-colors" />
                    </button>

                    <button 
                      onClick={() => handleQuizAnswer(2, 'french')}
                      className="w-full text-left p-4 rounded-xl border border-[#EFE8DC] hover:border-[#B65538] hover:bg-[#FAF4EA]/50 transition-all font-medium text-sm text-[#2A211B] flex items-center justify-between group"
                    >
                      <span>예술 작품 같은 페이스트리 프레임 (사블레 도우, 바닐라 타르트, 생또노레)</span>
                      <ChevronRight size={14} className="text-[#5F4E43]/40 group-hover:text-[#B65538] transition-colors" />
                    </button>
                  </div>
                </div>
              )}

              {quizStep === 3 && quizResult && (
                <div className="space-y-6">
                  <div className="flex items-center gap-1.5 text-[#B0863C]">
                    <span className="text-xs font-bold bg-[#B0863C]/10 px-2 py-0.5 rounded">MATCH COMPLETE</span>
                    <span className="text-xs font-semibold">당신의 베이킹 수강 동반자로 아래 클래스를 매트릭스 매칭했습니다!</span>
                  </div>

                  {/* Recommendation card shortcut */}
                  <div className="p-4 bg-[#FAF4EA]/50 rounded-2xl border border-[#EFE8DC] flex gap-4 items-center">
                    <img 
                      referrerPolicy="no-referrer"
                      src={quizResult.thumbnail} 
                      alt="" 
                      className="w-20 h-20 rounded-lg object-cover border border-[#EFE8DC]/80 shadow"
                    />
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] text-[#B65538] font-bold uppercase">{quizResult.category}</span>
                      <h4 className="font-serif text-sm font-bold text-[#2A211B] leading-tight line-clamp-1">{quizResult.title}</h4>
                      <p className="text-[11px] text-[#5F4E43] font-light">추천 강사: <strong>{quizResult.instructor}</strong> ({quizResult.level}자용 코스)</p>
                      
                      <div className="flex items-center gap-1 pt-1">
                        <Star size={11} className="text-[#B0863C] fill-[#B0863C]" />
                        <span className="text-[10.5px] text-[#5F4E43] font-bold">{quizResult.rating.toFixed(1)}</span>
                        <span className="text-[10px] text-gray-400">({quizResult.reviewCount}평가)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => onNavigateToDetail(quizResult!.id)}
                      className="flex-1 py-3 bg-[#2A211B] hover:bg-[#B65538] text-[#FAF4EA] text-xs font-bold rounded-xl shadow transition-colors text-center cursor-pointer"
                    >
                      매칭 클래스 상세보증 보러가기
                    </button>
                    <button 
                      onClick={resetQuiz}
                      className="px-4 py-3 bg-white hover:bg-[#FAF4EA] border border-[#EFE8DC] text-[#5F4E43] text-xs font-medium rounded-xl transition-colors cursor-pointer"
                    >
                      다시 테스트
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </section>

      {/* 4. THE SIGNATURE CLASS CATALOG (Anchor for navigation) */}
      <span id="catalog-grid-anchor" className="block relative -top-6" />
      <section className="py-20 px-6 sm:px-12 max-w-7xl mx-auto">
        
        {/* Section Heading with curation touch */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 border-b border-[#EFE8DC]/70 pb-6">
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#B0863C] tracking-widest uppercase">The Atelier Lineup</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2A211B]">아틀리에 클래스 라인업</h2>
            <p className="text-xs sm:text-sm text-[#5F4E43] font-light">각 클래스는 영구 무제한 수강, 정밀 레시피 PDF 노트, 카페 대량 생산용 배합 파일 권리가 동시 상속됩니다.</p>
          </div>
          
          {/* Aesthetic tabs selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 w-full md:w-auto">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4.5 py-2.5 text-xs font-medium rounded-xl whitespace-nowrap transition-all duration-300 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#2A211B] text-[#FAF4EA] font-semibold hover:shadow-md'
                    : 'bg-white text-[#5F4E43] border border-[#EFE8DC] hover:text-[#2A211B] hover:bg-[#FAF4EA]/80'
                }`}
              >
                {cat === 'All' ? '전체 클래스' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Grid Area */}
        {filteredClasses.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-[#EFE8DC] p-8 max-w-lg mx-auto">
            <BadgeAlert className="mx-auto text-[#B65538] mb-3" size={32} />
            <h3 className="font-serif text-base font-bold text-[#2A211B]">일치하는 디저트 에디션이 없습니다.</h3>
            <p className="text-[#5F4E43] text-xs font-light mt-1">검색어나 선택하신 카테고리 필터를 검토해주세요.</p>
            <button 
              onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
              className="mt-4 px-5 py-2 bg-[#B1863C] text-white text-xs font-semibold rounded-lg shadow hover:bg-[#9a7432] transition-colors"
            >
              전체 목록 보기 초기화
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredClasses.map(cls => {
              const discountPercent = Math.round((1 - cls.price / cls.originalPrice) * 100);
              const monthlyInstallment = Math.round(cls.price / 12);
              
              return (
                <div 
                  id={`class-card-${cls.id}`}
                  key={cls.id}
                  className="bg-white rounded-2xl border border-[#EFE8DC] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col group"
                >
                  {/* Image wrapper with high detail animation */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#FAF4EA]">
                    <img 
                      referrerPolicy="no-referrer"
                      src={cls.thumbnail} 
                      alt={cls.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter brightness-[0.97]"
                    />
                    
                    {/* Dark gradient vignette edge */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-60 pointer-events-none" />

                    {/* Left Category Badge Overlays */}
                    <span className="absolute top-3 left-3 bg-[#2A211B]/90 backdrop-blur-md text-[#FAF4EA] text-[10px] font-semibold px-2.5 py-1 rounded-lg tracking-wider border border-white/5 uppercase">
                      {cls.category}
                    </span>

                    {/* Right Ownership/Discount Overlays */}
                    <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                      <span className="bg-[#B65538] text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full tracking-wider uppercase shadow-md">
                        평생 소장 VOD
                      </span>
                      {discountPercent > 0 && (
                        <span className="bg-[#B0863C] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-sm">
                          {discountPercent}% OFF
                        </span>
                      )}
                    </div>

                    {/* FREE PREVIEW FLOATING ACCENT BOARD (Happy Happy Academy point) */}
                    <span className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md text-[#2A211B] text-[10px] font-semibold px-2.5 py-1.5 rounded-lg shadow-lg border border-[#EFE8DC]/80 flex items-center gap-1.5">
                      <PlayCircle size={13} className="text-[#B65538] animate-pulse" />
                      <span>1차시 무료 즉시 보기 포함</span>
                    </span>

                    {/* Students total counter */}
                    <span className="absolute bottom-3 right-3 bg-[#2A211B]/65 backdrop-blur text-white text-[9px] px-2 py-1 rounded">
                      누적 {cls.studentsCount.toLocaleString()}명 수강
                    </span>
                  </div>

                  {/* Card Main Editorial Content */}
                  <div className="p-6 flex-grow flex flex-col justify-between space-y-6">
                    <div className="space-y-3">
                      
                      {/* Instructor detailed profile header */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#B1863C]">{cls.instructor}</span>
                        <span className="text-[10px] text-[#5F4E43]/45">|</span>
                        <span className="text-[10px] text-[#5F4E43]/90 font-light truncate max-w-[190px]">{cls.instructorTitle}</span>
                      </div>

                      {/* Title: High serif, line limit */}
                      <h3 
                        onClick={() => onNavigateToDetail(cls.id)}
                        className="font-serif text-[17px] sm:text-[18px] font-bold text-[#2A211B] line-clamp-2 hover:text-[#B65538] cursor-pointer transition-colors leading-snug"
                      >
                        {cls.title}
                      </h3>

                      {/* Multi metrics badges bar (Clean, with colored contrasts) */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-[#B0863C] bg-[#B0863C]/6 px-2 py-1 rounded-md">
                          <Star size={11} className="fill-[#B0863C] text-none" />
                          <span>{cls.rating.toFixed(1)}</span>
                          <span className="text-[10px] text-[#5F4E43]/60 font-medium">({cls.reviewCount} 리뷰)</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10.5px] text-[#5F4E43] font-light bg-[#FAF4EA] px-2 py-1 rounded-md">
                          <Clock size={11} />
                          <span>{cls.duration}</span>
                        </div>
                        <div className="text-[10.5px] text-[#B65538] font-semibold bg-[#B65538]/6 px-2 py-1 rounded-md border border-[#B65538]/10">
                          {cls.level}마스터
                        </div>
                      </div>

                      {/* Detail overview text excerpt */}
                      <p className="text-xs text-[#5F4E43]/85 font-light leading-relaxed line-clamp-2">
                        {cls.description}
                      </p>

                      {/* Class custom highlights flags (Sugarlane signature keywords) */}
                      <div className="flex flex-wrap gap-1.5 pt-1.5">
                        <span className="text-[9.5px] text-[#5F4E43]/80 bg-[#FAF4EA] rounded-full px-2 py-0.5 border border-[#EFE8DC]">#원가절감 배합</span>
                        <span className="text-[9.5px] text-[#5F4E43]/80 bg-[#FAF4EA] rounded-full px-2 py-0.5 border border-[#EFE8DC]">#밀착 오븐피드백</span>
                        <span className="text-[9.5px] text-[#5F4E43]/80 bg-[#FAF4EA] rounded-full px-2 py-0.5 border border-[#EFE8DC]">#비밀 PDF북</span>
                      </div>
                    </div>

                    {/* Price with monthly split indicator */}
                    <div className="pt-4 border-t border-[#EFE8DC]/70 flex items-end justify-between">
                      <div className="space-y-0.5">
                        <span className="block text-[10.5px] text-[#5F4E43]/50 line-through">₩{cls.originalPrice.toLocaleString()}원</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-bold text-[#2A211B]">₩{cls.price.toLocaleString()}</span>
                          <span className="text-[11px] text-[#B65538] font-bold">일시불</span>
                        </div>
                        <span className="text-[10px] text-[#B0863C] block font-light">
                          무이자 12개월 할부 시 <strong className="font-bold text-[#B0863C]">월 ₩{monthlyInstallment.toLocaleString()}원</strong>
                        </span>
                      </div>

                      <button 
                        onClick={() => onNavigateToDetail(cls.id)}
                        className="px-4 py-2.5 bg-[#2A211B] text-white text-[11px] font-bold rounded-xl hover:bg-[#B65538] transition-all cursor-pointer shadow-sm shadow-[#2A211B]/10 active:scale-95 flex items-center gap-1"
                      >
                        <span>마스터 코스 탐색</span>
                        <ChevronRight size={12} />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>


      {/* 5. STUDENT BAKING MASTERPIECES ARCHIVE (New highly detailed review section inspired by Sugar Lane & Happy Happy Academy to drive maximum trust!) */}
      <section className="py-20 px-6 sm:px-12 bg-white/70 border-t border-b border-[#EFE8DC]/60">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#B1863C] tracking-widest uppercase">Student Achievements</span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2A211B] tracking-tight">수강생 실습 아카이브</h2>
              <p className="text-xs sm:text-sm text-[#5F4E43] font-light">Atelier Crème 오리지널 교육과정을 수강하고 가내 스튜디오 및 상업 오븐에서 직접 구워낸 리얼 포토 후기입니다.</p>
            </div>

            {/* Sub category filter tabs simple state */}
            <div className="flex items-center gap-1 text-[11px]">
              {['All', '정통 프렌치 디저트', '클래식 구움과자', '모던 타르트'].map(fTag => (
                <button
                  key={fTag}
                  onClick={() => setActiveArchiveCategory(fTag)}
                  className={`px-3 py-1.5 rounded-lg transition-all font-medium cursor-pointer ${
                    activeArchiveCategory === fTag 
                      ? 'bg-[#B0863C] text-white' 
                      : 'bg-[#FAF4EA] text-[#5F4E43] hover:bg-gray-100'
                  }`}
                >
                  {fTag === 'All' ? '전체 실습작' : fTag}
                </button>
              ))}
            </div>
          </div>

          {/* Student Work Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredStudentWorks.map(work => (
              <div 
                key={work.id}
                className="bg-white rounded-2xl overflow-hidden border border-[#EFE8DC] shadow-sm hover:shadow-md transition-shadow group flex flex-col"
              >
                {/* Photo frame with zoom */}
                <div className="relative aspect-[4/3] overflow-hidden bg-[#FAF4EA]">
                  <img 
                    referrerPolicy="no-referrer"
                    src={work.imageUrl} 
                    alt={work.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-sm text-[#FAF4EA] text-[9px] font-medium px-2 py-0.5 rounded">
                    {work.tag}
                  </span>
                </div>

                {/* Info and commentary */}
                <div className="p-5 flex-grow flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold text-[#2A211B]">{work.studentName}</span>
                      <div className="flex text-[#B0863C]">
                        <Star size={10} className="fill-current" />
                        <Star size={10} className="fill-current" />
                        <Star size={10} className="fill-current" />
                        <Star size={10} className="fill-current" />
                        <Star size={10} className="fill-current" />
                      </div>
                    </div>
                    <span className="block text-[10px] text-[#B0863C] font-semibold">{work.classTitle}</span>
                    <h4 className="font-serif text-sm font-semibold text-[#2A211B] line-clamp-1 pt-1">{work.title}</h4>
                    <p className="text-[11.5px] text-[#5F4E43] leading-relaxed font-light line-clamp-4 pt-1">
                      “{work.comment}”
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#FAF4EA] flex items-center justify-between text-[10px] text-[#5F4E43]/50">
                    <span>Atelier Verified student</span>
                    <button 
                      onClick={() => onNavigateToDetail(work.classNameId)} 
                      className="text-[#B65538] hover:underline font-bold"
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

      {/* 6. COZY PROFESSIONAL CHEF SPECIALIST CARDS SELECTORS (Happy Happy Academy point) */}
      <section className="py-20 px-6 sm:px-12 max-w-7xl mx-auto border-b border-[#EFE8DC]/60">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left: Chef Narrative Intro */}
          <div className="lg:col-span-7 space-y-6">
            <span className="text-[10px] font-bold text-[#B0863C] tracking-widest uppercase block">The Mastermind & Owner</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2A211B] leading-tight keep-all break-keep">
              Atelier Crème을 이끄는 1인 아티장 파티시에, <span className="font-serif text-[#B65538] italic">민소희</span> 입니다.
            </h2>
            <p className="text-sm text-[#5F4E43] font-light leading-relaxed keep-all break-keep">
              Atelier Crème은 다른 강사에게 외주를 맡기거나 보조 인력의 복제 기획으로 채워진 공장식 교육 플랫폼이 아닙니다.
            </p>
            <p className="text-sm text-[#5F4E43] font-light leading-relaxed keep-all break-keep">
              파리 <strong>Ritz Escoffier</strong> 졸업 이래로, 한남동 디저트 가판대를 전석 매진으로 장식했던 모든 레시피의 계량, 머랭 수분 제어 설계, 원가 산출 엑셀 배합 시트 작성 및 1:1 수강생 질문 해결까지 — <strong>오직 저의 이름 석 자와 오너 책임을 걸고 1인 마스터 체제로 전개합니다.</strong>
            </p>
            
            <div className="flex flex-wrap gap-4 pt-2">
              <button 
                onClick={onNavigateToInstructor}
                className="px-6 py-3 bg-[#2A211B] hover:bg-[#B65538] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1"
              >
                <span>민소희 셰프 철학 & 히스토리 더 알아보기</span>
                <ChevronRight size={13} />
              </button>
              
              <button 
                onClick={onNavigateToBooks}
                className="px-6 py-3 bg-white hover:bg-[#FAF4EA] text-[#5F4E43] border border-[#EFE8DC] text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                출간 비밀 레시피 북 구경가기
              </button>
            </div>
          </div>

          {/* Right: Splendid interactive card */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-[#EFE8DC] rounded-3xl p-8 relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 max-w-sm mx-auto">
              {/* Gold layout indicator badge */}
              <div className="absolute top-0 right-0 bg-[#B0863C] text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl tracking-wider">
                1인 직강 보증
              </div>

              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-[#FAF4EA] shadow-md bg-stone-100">
                  <img 
                    referrerPolicy="no-referrer"
                    src="https://images.unsplash.com/photo-1581299894007-aaa50297cf16?auto=format&fit=crop&q=80&w=300" 
                    alt="Chef Min Sohee" 
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#B1863C] bg-[#B1863C]/10 px-2 py-0.5 rounded">SOLE MASTER PIECE</span>
                  <h3 className="font-serif text-xl font-bold text-[#2A211B]">민소희 (Sohee Min)</h3>
                  <p className="text-xs text-[#5F4E43]/80 font-medium font-serif italic">Atelier Crème 대표 파티시에</p>
                </div>

                <blockquote className="text-xs text-[#5F4E43]/90 italic font-light leading-relaxed bg-[#FAF4EA]/50 p-3 rounded-xl border border-[#EFE8DC]/40">
                  “단 한 명만의 완벽한 통제 아래 완성도가 보증된 최상의 레시피만을 오롯이 당신의 주방에 전달해 드립니다.”
                </blockquote>

                <div className="pt-2 border-t border-[#FAF4EA] w-full text-[11px] text-[#5F4E43] flex justify-around font-medium">
                  <div>VOD 3개 마스터 코스</div>
                  <div>만족도 Rating 4.93/5.0</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 7. REFINED PREMIER FAQ COLLAPSIBLES (Aesthetic Accordion) */}
      <section className="py-20 px-6 sm:px-12 max-w-4xl mx-auto">
        <div className="text-center space-y-3 mb-12">
          <HelpCircle className="mx-auto text-[#B65538]" size={28} />
          <h2 className="font-serif text-3xl font-bold text-[#2A211B]">자주 묻는 질문 (FAQ)</h2>
          <p className="text-xs sm:text-sm text-[#5F4E43] font-light">Atelier Crème VOD 보관함 수강 시작 전 확인해보세요.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div 
                key={idx}
                className="bg-white rounded-2xl border border-[#EFE8DC] overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full text-left p-6 flex justify-between items-center gap-4 bg-white hover:bg-[#FAF4EA]/40 transition-colors"
                >
                  <p className="font-serif text-sm sm:text-base font-bold text-[#2A211B]">
                    {faq.q}
                  </p>
                  <span className={`text-[#B65538] shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown size={18} />
                  </span>
                </button>
                
                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-xs sm:text-[13px] text-[#5F4E43] leading-relaxed font-light border-t border-[#FAF4EA] bg-[#FAF4EA]/20">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. PRESTIGE NEWSLETTER & FOOT PRINT BRAND ENCLOSURE */}
      <section className="bg-[#2A211B] text-[#FAF4EA] py-16 px-6 sm:px-12 rounded-t-[2.5rem] relative overflow-hidden">
        {/* Decorative corner pastries vector overlay watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#B0863C]/5 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <span className="text-xs font-bold text-[#B0863C] tracking-[0.3em] uppercase block">Atelier Crème Atelier Signature</span>
          <h2 className="font-serif text-3xl sm:text-5xl font-bold leading-tight keep-all break-keep">
            일상을 특별한 예술로 바꾸는 프랑스 가치, 지금 당신의 아이디로 <span className="font-serif italic text-[#B0863C]">아틀리에</span>에 가입하세요
          </h2>
          <p className="text-xs sm:text-sm text-white/70 max-w-xl mx-auto font-light leading-relaxed keep-all break-keep">
            프리미엄 정통 콩피츄르와 머랭 습도 보정을 한 손에 거머쥐는 순간, 동네 골목 디저트 숍의 판도가 변합니다. 
            단 한 번의 구매로 평생 소장권을 확보하고 장인 쉐프들의 직강 세션에 합류하세요.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3 max-w-sm mx-auto">
            <input 
              type="email" 
              placeholder="뉴스레터 레시피 구독 이메일 주소..." 
              className="px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:ring-1 focus:ring-[#B0863C] border border-white/10"
            />
            <button 
              onClick={() => {
                alert('Atelier Crème 무료 시즌 레시피 메일 구독이 신청되었습니다!');
              }}
              className="bg-[#B0863C] text-white py-3 px-5 rounded-xl text-xs font-bold hover:bg-[#B65538] transition-colors"
            >
              무료 레시피 구독
            </button>
          </div>

          <div className="flex justify-center gap-8 text-[11px] text-white/50 pt-8 border-t border-white/5">
            <span>• 오프라인 아카데미 서울 / 타이베이 동시 제휴</span>
            <span>• 카카오톡 및 이메일 24시간 피드백 지원</span>
          </div>
        </div>
      </section>

    </div>
  );
}
