import React, { useState } from 'react';
import { ClassItem, CurriculumChapter, Review } from '../types';
import { CURRICULUM_DATA, REVIEWS_DATA } from '../data';
import { Star, Shield, Lock, Play, CirclePlay, Gift, ChevronRight, FileText, CheckCircle2, User, Sparkles, MessageSquare, BookOpen, Clock } from 'lucide-react';

interface DetailScreenProps {
  cls: ClassItem;
  purchased: boolean;
  onNavigateToCatalog: () => void;
  onNavigateToPayment: (id: string) => void;
  onStartPreview: (classId: string, lessonId: string) => void;
}

export default function DetailScreen({ cls, purchased, onNavigateToCatalog, onNavigateToPayment, onStartPreview }: DetailScreenProps) {
  const [activeTab, setActiveTab] = useState<'intro' | 'curriculum' | 'reviews'>('intro');
  const [videoPlaying, setVideoPlaying] = useState(false);

  const curriculum = CURRICULUM_DATA[cls.id] || [];
  const reviews = REVIEWS_DATA.filter(r => r.classId === cls.id);

  // Total lessons count
  const totalLessons = curriculum.reduce((acc, curr) => acc + curr.lessons.length, 0);

  return (
    <div id="detail-screen" className="bg-[#FAF4EA] py-8 px-4 sm:px-8 max-w-7xl mx-auto pb-28 lg:pb-8">
      
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#5F4E43] mb-6">
        <span className="hover:underline cursor-pointer" onClick={onNavigateToCatalog}>클래스 홈</span>
        <ChevronRight size={12} />
        <span className="font-semibold text-[#B65538]">{cls.category}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Area: Video preview, title metadata, description, tabs */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 16:9 Cover Video / Image Preview */}
          <div id="cover-video-wrapper" className="relative aspect-[16/9] bg-black rounded-2xl overflow-hidden shadow-lg border-2 border-white group">
            {!videoPlaying ? (
              <>
                <img 
                  referrerPolicy="no-referrer"
                  src={cls.thumbnail} 
                  alt={cls.title} 
                  className="w-full h-full object-cover brightness-75 group-hover:scale-101 transition-transform duration-500"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/30">
                  <button 
                    onClick={() => setVideoPlaying(true)}
                    className="w-16 h-16 rounded-full bg-[#B65538]/90 hover:bg-[#B65538] text-[#FAF4EA] flex items-center justify-center shadow-2xl hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Play size={26} className="ml-1 fill-white" />
                  </button>
                  <span className="mt-3 text-xs bg-black/60 backdrop-blur-md text-[#FAF4EA] px-3 py-1 rounded-full font-medium tracking-wide">
                    맛보기 오리엔테이션 및 하이라이트 (1분 30초)
                  </span>
                </div>
              </>
            ) : (
              <div className="w-full h-full relative">
                <iframe 
                  className="w-full h-full" 
                  src={`${curriculum[0]?.lessons[0]?.videoUrl || 'https://www.w3schools.com/html/mov_bbb.mp4'}?autoplay=1`} 
                  title="Class Preview Video"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
                <button 
                  onClick={() => setVideoPlaying(false)}
                  className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white text-xs px-3 py-1.5 rounded-md cursor-pointer"
                >
                  미리보기 닫기
                </button>
              </div>
            )}
            
            {/* Corner Badge */}
            <span className="absolute top-4 left-4 bg-[#B0863C] text-white text-xs font-bold px-3 py-1 rounded-md shadow-md uppercase tracking-wider">
              ★ {cls.level} 수준 정밀 촬영
            </span>
          </div>

          {/* Title & Instructor information */}
          <div className="space-y-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2A211B] leading-snug">
              {cls.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs font-sans text-[#5F4E43]">
              <div className="flex items-center gap-1.5 font-bold text-[#B0863C]">
                <Star size={14} className="fill-[#B0863C]" />
                <span>{cls.rating}점 ({cls.reviewCount}개의 실제 후기)</span>
              </div>
              <span>•</span>
              <span>수강생 {cls.studentsCount.toLocaleString()}명 만족 수강 중</span>
            </div>

            {/* Micro card of instructor */}
            <div className="flex items-center gap-4 p-4 bg-white border border-[#EFE8DC] rounded-xl mt-4">
              <div className="w-12 h-12 rounded-full bg-[#B0863C]/10 border-2 border-[#B0863C]/30 flex items-center justify-center font-serif text-[#B0863C] font-bold text-lg">
                Chef
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#2A211B]">{cls.instructor} 셰프</h4>
                <p className="text-xs text-[#5F4E43] mt-0.5">{cls.instructorTitle}</p>
              </div>
            </div>
          </div>

          {/* Tab buttons switcher */}
          <div className="flex border-b border-[#EFE8DC] bg-white rounded-t-xl p-1 mt-6">
            <button
              onClick={() => setActiveTab('intro')}
              className={`flex-1 py-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'intro' ? 'bg-[#FAF4EA] text-[#B65538] shadow-sm' : 'text-[#5F4E43]/70 hover:text-[#5F4E43]'
              } flex items-center justify-center gap-1.5`}
            >
              <Sparkles size={14} />
              클래스 소개
            </button>
            <button
              id="detail-tab-curriculum"
              onClick={() => setActiveTab('curriculum')}
              className={`flex-1 py-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'curriculum' ? 'bg-[#FAF4EA] text-[#B65538] shadow-sm' : 'text-[#5F4E43]/70 hover:text-[#5F4E43]'
              } flex items-center justify-center gap-1.5`}
            >
              <BookOpen size={14} />
              커리큘럼 ({totalLessons}개 차시)
            </button>
            <button
              id="detail-tab-reviews"
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 py-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'reviews' ? 'bg-[#FAF4EA] text-[#B65538] shadow-sm' : 'text-[#5F4E43]/70 hover:text-[#5F4E43]'
              } flex items-center justify-center gap-1.5`}
            >
              <MessageSquare size={14} />
              수강 후기 ({reviews.length})
            </button>
          </div>

          {/* Tab content renders */}
          <div className="bg-white p-6 rounded-b-xl border border-t-0 border-[#EFE8DC] min-h-[300px]">
            
            {/* TAB 1: INTRO */}
            {activeTab === 'intro' && (
              <div className="space-y-6 text-sm text-[#2A211B] leading-relaxed font-light">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#B1863C] mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#B1863C] rounded-full inline-block"></span>
                    프리미엄 세션 소개
                  </h3>
                  <p className="text-[#5F4E43] font-light leading-relaxed">
                    {cls.description}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 bg-[#FAF4EA]/40 rounded-xl border border-[#EFE8DC]">
                    <h4 className="font-bold text-xs text-[#B65538] uppercase mb-2">이 클래스에서 학습하는 레시피 구성</h4>
                    <ul className="space-y-1.5 text-xs text-[#5F4E43]">
                      <li>• 완벽한 구색을 자랑하는 꼬끄의 결합 레시피</li>
                      <li>• 프랑스 천연 고메 버터 가공 헤이즐넛 농축법</li>
                      <li>• 피스타치오 프랄린의 당도와 침투율 분배식</li>
                      <li>• 제철 과일 당절임(콩피츄르) 추출 온도 매핑</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-[#FAF4EA]/40 rounded-xl border border-[#EFE8DC]">
                    <h4 className="font-bold text-xs text-[#B0863C] uppercase mb-2">수강생에게 제공되는 다운로드 혜택</h4>
                    <ul className="space-y-1.5 text-xs text-[#5F4E43]">
                      <li>• [PDF] 셰프 소장 아티스트 전용 소수점 배합표</li>
                      <li>• [PDF] 오븐 온도 편차 보정 보조 템플릿</li>
                      <li>• 대만/국내 번역 통합 정밀 스크립트 전문</li>
                      <li>• 영구 소장 평생 무제한 온라인 Q&A 액세스</li>
                    </ul>
                  </div>
                </div>

                <div className="pt-4">
                  <h3 className="font-serif text-lg font-bold text-[#B65538] mb-2">수강 전 확인사항</h3>
                  <p className="text-xs text-[#5F4E43] leading-relaxed">
                    본 VOD 클래스는 일회성 라이브가 아닌 사전 제작된 고화질 녹화 본 스트리밍 서비스이며, 결제 즉시 평생 소장 자격이 주어집니다. 
                    타 플랫폼 제품과 달리 기간 제약 없이 원하실 때 언제든 완주가 가능합니다. 해외에서 발행된 신용카드가 완전하게 호환됩니다.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: CURRICULUM */}
            {activeTab === 'curriculum' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-[#FAF4EA] p-3 rounded-lg border border-[#EFE8DC] mb-2">
                  <span className="text-xs font-semibold text-[#B65538]">
                    💡 1차시 영상은 비회원도 결제 없이 볼 수 있는 무료 수강용 오리엔테이션입니다.
                  </span>
                </div>

                <div className="space-y-4">
                  {curriculum.map((chapter) => (
                    <div key={chapter.id} className="border border-[#EFE8DC] rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-[#FAF4EA]/50 p-4 border-b border-[#EFE8DC] flex justify-between items-center">
                        <h4 className="font-serif text-sm font-bold text-[#2A211B]">{chapter.title}</h4>
                        <span className="text-[11px] text-[#B0863C] font-semibold">{chapter.lessons.length}차시 구성</span>
                      </div>
                      
                      <div className="divide-y divide-[#EFE8DC]">
                        {chapter.lessons.map((lesson) => {
                          const isFreePreview = lesson.isFree;
                          return (
                            <div 
                              key={lesson.id} 
                              className={`p-4 flex items-center justify-between text-xs sm:text-sm hover:bg-[#FAF4EA]/20 transition-colors ${
                                isFreePreview ? 'bg-[#B0863C]/5 font-medium' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {isFreePreview ? (
                                  <span className="text-[#B65538] animate-pulse">
                                    <CirclePlay size={18} />
                                  </span>
                                ) : (
                                  <span className="text-[#5F4E43]/60">
                                    <Lock size={16} />
                                  </span>
                                )}
                                <div>
                                  <span className="text-xs text-[#2A211B]">{lesson.title}</span>
                                  {isFreePreview && (
                                    <span className="ml-2 inline-block bg-[#B65538] text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                                      무료 맛보기
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-[#5F4E43] font-mono"><Clock size={11} className="inline mr-0.5" />{lesson.duration}</span>
                                {isFreePreview ? (
                                  <button
                                    id={`preview-btn-${lesson.id}`}
                                    onClick={() => onStartPreview(cls.id, lesson.id)}
                                    className="px-3 py-2 min-h-[36px] bg-[#B65538] hover:bg-[#A0452C] text-[#FAF4EA] text-xs font-bold rounded cursor-pointer"
                                  >
                                    즉시 시청
                                  </button>
                                ) : (
                                  <span className="text-xs text-[#5F4E43]/50">잠금</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: REVIEWS */}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-[#FAF4EA] p-4 rounded-xl border border-[#EFE8DC] mb-4">
                  <div className="text-center p-2">
                    <span className="block text-3xl font-serif font-extrabold text-[#B65538]">{cls.rating}</span>
                    <span className="text-[10px] text-[#5F4E43]">수강생 평점</span>
                  </div>
                  <div className="h-10 w-px bg-[#EFE8DC]"></div>
                  <p className="text-xs text-[#5F4E43] leading-relaxed keep-all break-keep">
                    실제 결제하여 강의를 영구 소장한 한국 & 대만 글로벌 수강생의 후기입니다. 100% 무편집 신뢰를 바탕으로 후기를 수합하고 있으며 피드백을 통해 셰프가 답변을 기재합니다.
                  </p>
                </div>

                <div className="space-y-4 divide-y divide-[#EFE8DC]">
                  {reviews.length === 0 ? (
                    <div className="text-center py-8 text-xs text-[#5F4E43]/60">아직 작성된 후기가 없습니다. 첫 번째 영구 소장 수강생 후기를 남겨주세요.</div>
                  ) : (
                    reviews.map((rev) => (
                      <div key={rev.id} className="pt-4 space-y-2 first:pt-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img 
                              referrerPolicy="no-referrer"
                              src={rev.avatar} 
                              alt={rev.userName} 
                              className="w-8 h-8 rounded-full border border-[#EFE8DC]"
                            />
                            <div>
                              <span className="text-xs font-bold text-[#2A211B]">{rev.userName}</span>
                              <div className="flex items-center text-[#B0863C] transform scale-90 -translate-x-1.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} size={10} className={i < rev.rating ? 'fill-[#B0863C]' : 'opacity-20'} />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-[#5F4E43]/60 font-mono">{rev.date}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-[#5F4E43] leading-relaxed font-light pl-10">
                          {rev.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Right Area: Purchase details Float Sticky Box */}
        <div className="lg:col-span-4 sticky top-24">
          
          <div className="bg-white rounded-2xl border-2 border-[#B65538] p-6 shadow-xl space-y-6">
            
            <div className="inline-block bg-[#B65538]/10 text-[#B65538] text-[10px] font-bold px-3 py-1 rounded-md uppercase tracking-wider">
              LIFETIME ACCESS PASS (평생 소장)
            </div>

            <div className="space-y-1">
              <span className="block text-xs text-[#5F4E43]/70 line-through">₩{cls.originalPrice.toLocaleString()}</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-serif font-extrabold text-[#2A211B]">₩{cls.price.toLocaleString()}</span>
                <span className="text-sm font-bold text-[#B0863C]">VAT 포함</span>
              </div>
              <p className="text-[11px] text-[#B65538] font-bold">
                * {Math.round((1 - cls.price / cls.originalPrice) * 100)}% 얼리버드 한정 혜택 (한 번만 사면 평생 소장)
              </p>
            </div>

            <div className="h-px bg-[#EFE8DC]"></div>

            {/* Lifetime Access highlights */}
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-xs text-[#5F4E43]">
                <CheckCircle2 size={15} className="text-[#B65538] mt-0.5 shrink-0" />
                <span>시간/횟수 무제한 시청 VOD</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-[#5F4E43]">
                <CheckCircle2 size={15} className="text-[#B65538] mt-0.5 shrink-0" />
                <span>셰프 조율 소수점 원본 배합표 100% 동봉</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-[#5F4E43]">
                <CheckCircle2 size={15} className="text-[#B65538] mt-0.5 shrink-0" />
                <span>대만・해외 카드 간편 결제 완벽 연동</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-[#5F4E43]">
                <CheckCircle2 size={15} className="text-[#B65538] mt-0.5 shrink-0" />
                <span>1:1 셰프 보이스 피드백 3회 제공 패스권 예약</span>
              </div>
            </div>

            {/* CTA Buy Buttons */}
            {purchased ? (
              <div className="space-y-2">
                <div className="bg-emerald-50 text-emerald-800 p-2 text-xs rounded text-center font-medium border border-emerald-200">
                  이미 권한을 보유 중인 평생소장 강의입니다.
                </div>
                <button
                  onClick={() => onStartPreview(cls.id, curriculum[0]?.lessons[0]?.id || '')}
                  className="w-full py-3 bg-[#2A211B] hover:bg-[#B65538] text-white font-bold text-xs sm:text-sm rounded-xl shadow transition-colors cursor-pointer text-center block"
                >
                  시청하기 플레이어로 이동
                </button>
              </div>
            ) : (
              <button
                id="btn-buy-now"
                onClick={() => onNavigateToPayment(cls.id)}
                className="w-full py-3.5 bg-[#B65538] hover:bg-[#9C3F24] text-[#FAF4EA] font-extrabold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer text-center block"
              >
                지금 평생 소장권 결제하기
              </button>
            )}

            <button
              onClick={() => {
                setActiveTab('curriculum');
                const element = document.getElementById('detail-tab-curriculum');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="w-full py-2 bg-transparent hover:bg-[#FAF4EA] text-[#5F4E43] font-semibold text-xs rounded-lg border border-[#EFE8DC] transition-colors cursor-pointer text-center block"
            >
              1차시 무료 맛보기 먼저 보기
            </button>

            <p className="text-[10px] text-center text-[#5F4E43]/60 leading-normal">
              글로벌 수강생 대상 한정 가격이며, 결제 후 7일 이내 동영상 시청 이력이 없을 시 100% 환불 처리 가능합니다. (맛보기 1차시 시청은 환불 정책에 포함되지 않습니다.)
            </p>

          </div>
        </div>

      </div>

      {/* Sticky Bottom Row for Quick Purchase Conversion on Mobile Devices */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EFE8DC] p-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-8px_20px_rgba(42,33,27,0.08)] flex items-center justify-between gap-3 px-4">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-[#B65538] uppercase tracking-wider">LIFETIME ACCESS PASS</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-serif font-extrabold text-[#2A211B]">₩{cls.price.toLocaleString()}</span>
            <span className="text-[10px] text-[#B0863C] font-bold">{Math.round((1 - cls.price / cls.originalPrice) * 100)}% 특가</span>
          </div>
        </div>
        
        {purchased ? (
          <button
            onClick={() => onStartPreview(cls.id, curriculum[0]?.lessons[0]?.id || '')}
            className="px-5 py-3 min-h-[44px] bg-[#2A211B] text-white font-bold text-xs rounded-xl shadow cursor-pointer text-center whitespace-nowrap"
          >
            플레이어로 이동
          </button>
        ) : (
          <button
            id="mobile-sticky-buy"
            onClick={() => onNavigateToPayment(cls.id)}
            className="px-6 py-3 min-h-[44px] bg-[#B65538] hover:bg-[#9C3F24] text-[#FAF4EA] font-extrabold text-xs rounded-xl shadow-md text-center whitespace-nowrap cursor-pointer"
          >
            지금 평생소장 결제
          </button>
        )}
      </div>

    </div>
  );
}
