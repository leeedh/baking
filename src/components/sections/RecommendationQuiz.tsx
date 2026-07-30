'use client';

import { useRouter } from '@/i18n/navigation';
import { ChevronRight, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ClassItem } from '../../types';

interface RecommendationQuizProps {
  /** course_catalog 뷰에서 서버가 로드한 게시 클래스 목록. */
  classes: ClassItem[];
}

// DC-96 · 추천 퀴즈. 온라인 클래스 페이지(/classes) 전용 섹션으로 분리.
// 앵커 id는 히어로의 "퀴즈 바로가기"가 /classes#baking-quiz-section으로 넘어올 때 스크롤 타깃이 된다.
export default function RecommendationQuiz({ classes }: RecommendationQuizProps) {
  const t = useTranslations();
  const router = useRouter();

  const [quizStep, setQuizStep] = useState(1);
  const [quizLevel, setQuizLevel] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<ClassItem | null>(null);

  // Interactive Quiz recommendation logic
  const handleQuizAnswer = (step: number, answer: string) => {
    if (step === 1) {
      setQuizLevel(answer);
      setQuizStep(2);
      return;
    }

    // Select exact matched class
    let matched: ClassItem | undefined;
    if (answer === 'french' || quizLevel === 'expert') {
      // High difficulty -> Tart or Macaron
      matched = classes.find((c) => c.id === 'class-tart') || classes[0];
    } else if (answer === 'butter') {
      // Butter focus -> Cookies
      matched = classes.find((c) => c.id === 'class-cookies') || classes[0];
    } else {
      matched = classes.find((c) => c.id === 'class-macarons') || classes[0];
    }

    setQuizResult(matched ?? null);
    setQuizStep(3);
  };

  const resetQuiz = () => {
    setQuizStep(1);
    setQuizLevel(null);
    setQuizResult(null);
  };

  return (
    <section
      id="baking-quiz-section"
      className="py-16 px-6 sm:px-12 bg-cream border-b border-brown-light/80"
    >
      <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-brown-light overflow-hidden shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-5">
          {/* Left title section */}
          <div className="md:col-span-2 bg-brown text-cream p-8 sm:p-10 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-gold tracking-widest uppercase">
                {t('quiz.badge')}
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold leading-tight break-keep">
                {t('quiz.title')}
              </h3>
              <p className="text-xs text-white/70 font-light leading-relaxed break-keep">
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
                <div className="flex items-center gap-1.5 text-terracotta">
                  <span className="text-xs font-bold bg-terracotta/10 px-2 py-0.5 rounded">
                    STEP 01
                  </span>
                  <span className="text-xs font-semibold">현재 나의 오븐 숙련도는 어느 쪽인가요?</span>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => handleQuizAnswer(1, 'beginner')}
                    className="w-full text-left p-4 rounded-xl border border-brown-light hover:border-terracotta hover:bg-cream/50 transition-all font-medium text-sm text-brown flex items-center justify-between group"
                  >
                    <span>베이킹 초보 (기초적인 계량과 도구를 배우고 싶어요)</span>
                    <ChevronRight
                      size={14}
                      className="text-brown-medium/40 group-hover:text-terracotta transition-colors"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuizAnswer(1, 'hobbyist')}
                    className="w-full text-left p-4 rounded-xl border border-brown-light hover:border-terracotta hover:bg-cream/50 transition-all font-medium text-sm text-brown flex items-center justify-between group"
                  >
                    <span>
                      디저트 홈베이커 (마카롱, 까눌레 구운 성적이 있고 품질을 높이고 싶어요)
                    </span>
                    <ChevronRight
                      size={14}
                      className="text-brown-medium/40 group-hover:text-terracotta transition-colors"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuizAnswer(1, 'expert')}
                    className="w-full text-left p-4 rounded-xl border border-brown-light hover:border-terracotta hover:bg-cream/50 transition-all font-medium text-sm text-brown flex items-center justify-between group"
                  >
                    <span>
                      현직 파티시에 / 카페 자영업 (원가 세밀 배합과 판매 전개 노하우가 필요합니다)
                    </span>
                    <ChevronRight
                      size={14}
                      className="text-brown-medium/40 group-hover:text-terracotta transition-colors"
                    />
                  </button>
                </div>
              </div>
            )}

            {quizStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-1.5 text-terracotta">
                  <span className="text-xs font-bold bg-terracotta/10 px-2 py-0.5 rounded">
                    STEP 02
                  </span>
                  <span className="text-xs font-semibold">
                    추구하시는 베이킹의 풍미와 추구 디자인은 무엇인가요?
                  </span>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => handleQuizAnswer(2, 'sweet')}
                    className="w-full text-left p-4 rounded-xl border border-brown-light hover:border-terracotta hover:bg-cream/50 transition-all font-medium text-sm text-brown flex items-center justify-between group"
                  >
                    <span>밀착 쫀득하고 화려한 달콤함 (정밀한 정통 마카롱과 가나슈 필링)</span>
                    <ChevronRight
                      size={14}
                      className="text-brown-medium/40 group-hover:text-terracotta transition-colors"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuizAnswer(2, 'butter')}
                    className="w-full text-left p-4 rounded-xl border border-brown-light hover:border-terracotta hover:bg-cream/50 transition-all font-medium text-sm text-brown flex items-center justify-between group"
                  >
                    <span>진하고 고소한 구운 구움과자 향 (깊은 탄버터 휘낭시에, 명품 마들렌)</span>
                    <ChevronRight
                      size={14}
                      className="text-brown-medium/40 group-hover:text-terracotta transition-colors"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuizAnswer(2, 'french')}
                    className="w-full text-left p-4 rounded-xl border border-brown-light hover:border-terracotta hover:bg-cream/50 transition-all font-medium text-sm text-brown flex items-center justify-between group"
                  >
                    <span>
                      예술 작품 같은 페이스트리 프레임 (사블레 도우, 바닐라 타르트, 생또노레)
                    </span>
                    <ChevronRight
                      size={14}
                      className="text-brown-medium/40 group-hover:text-terracotta transition-colors"
                    />
                  </button>
                </div>
              </div>
            )}

            {quizStep === 3 && quizResult && (
              <div className="space-y-6">
                <div className="flex items-center gap-1.5 text-gold">
                  <span className="text-xs font-bold bg-gold/10 px-2 py-0.5 rounded">
                    MATCH COMPLETE
                  </span>
                  <span className="text-xs font-semibold">
                    당신의 베이킹 수강 동반자로 아래 클래스를 매트릭스 매칭했습니다!
                  </span>
                </div>

                {/* Recommendation card shortcut */}
                <div className="p-4 bg-cream/50 rounded-2xl border border-brown-light flex gap-4 items-center">
                  <img
                    referrerPolicy="no-referrer"
                    src={quizResult.thumbnail}
                    alt=""
                    className="w-20 h-20 rounded-lg object-cover border border-brown-light/80 shadow"
                  />
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] text-terracotta font-bold uppercase">
                      {quizResult.category}
                    </span>
                    <h4 className="font-serif text-sm font-bold text-brown leading-tight line-clamp-1">
                      {quizResult.title}
                    </h4>
                    <p className="text-[11px] text-brown-medium font-light">
                      추천 강사: <strong>{quizResult.instructor}</strong> ({quizResult.level}자용
                      코스)
                    </p>

                    <div className="flex items-center gap-1 pt-1">
                      <Star size={11} className="text-gold fill-gold" />
                      <span className="text-[10.5px] text-brown-medium font-bold">
                        {quizResult.rating.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        ({quizResult.reviewCount}평가)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/classes/${quizResult.id}`)}
                    className="flex-1 py-3 bg-brown hover:bg-terracotta text-cream text-xs font-bold rounded-xl shadow transition-colors text-center cursor-pointer"
                  >
                    매칭 클래스 상세보증 보러가기
                  </button>
                  <button
                    type="button"
                    onClick={resetQuiz}
                    className="px-4 py-3 bg-white hover:bg-cream border border-brown-light text-brown-medium text-xs font-medium rounded-xl transition-colors cursor-pointer"
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
  );
}
