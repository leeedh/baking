'use client';

import Button from '@/components/ui/Button';
import { useRouter } from '@/i18n/navigation';
import { ChevronRight, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import type { ClassItem } from '../../types';

interface RecommendationQuizProps {
  /** course_catalog 뷰에서 서버가 로드한 게시 클래스 목록. */
  classes: ClassItem[];
}

/** 문항 값은 매칭 로직의 키다 — 라벨만 메시지 카탈로그에서 꺼낸다. */
const STEP_1_VALUES = ['beginner', 'hobbyist', 'expert'] as const;
const STEP_2_VALUES = ['sweet', 'butter', 'french'] as const;
const STEP_1_KEYS = ['step1Beginner', 'step1Hobbyist', 'step1Expert'] as const;
const STEP_2_KEYS = ['step2Sweet', 'step2Butter', 'step2French'] as const;

/** 6번 복붙되어 있던 옵션 버튼. */
function QuizOption({ label, onSelect }: { label: string; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left p-4 min-h-[44px] rounded-xl border border-brown-light hover:border-terracotta hover:bg-cream/50 transition-all duration-200 ease-out-soft font-medium text-sm text-brown flex items-center justify-between gap-3 group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="break-keep">{label}</span>
      <ChevronRight
        size={14}
        className="shrink-0 text-brown-medium/50 group-hover:text-terracotta group-hover:translate-x-0.5 transition-all duration-200"
      />
    </button>
  );
}

// DC-96 · 추천 퀴즈. 온라인 클래스 페이지(/classes) 전용 섹션으로 분리.
// 앵커 id는 히어로의 "퀴즈 바로가기"가 /classes#baking-quiz-section으로 넘어올 때 스크롤 타깃이 된다.
export default function RecommendationQuiz({ classes }: RecommendationQuizProps) {
  const tq = useTranslations('sections.quiz');
  const t = useTranslations();
  const router = useRouter();

  const [quizStep, setQuizStep] = useState(1);
  const [quizLevel, setQuizLevel] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<ClassItem | null>(null);
  const stepRef = useRef<HTMLDivElement>(null);

  // 단계가 바뀌면 새 패널로 포커스를 옮긴다(예전에는 이전 단계가 언마운트되며 포커스가 body로 유실됐다).
  useEffect(() => {
    if (quizStep === 1) return;
    stepRef.current?.focus();
  }, [quizStep]);

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

  // 게시된 클래스가 없으면 추천할 대상이 없다 — 빈 결과 화면을 보여주는 대신 섹션을 숨긴다.
  if (classes.length === 0) return null;

  return (
    <section
      id="baking-quiz-section"
      aria-labelledby="quiz-heading"
      className="py-16 px-6 sm:px-12 bg-cream border-b border-brown-light/80"
    >
      <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-brown-light overflow-hidden shadow-panel">
        <div className="grid grid-cols-1 md:grid-cols-5">
          {/* Left title section */}
          <div className="md:col-span-2 bg-brown text-cream p-8 sm:p-10 flex flex-col justify-between">
            <div className="space-y-4">
              <p className="text-[11px] font-bold text-gold tracking-widest uppercase">
                {t('quiz.badge')}
              </p>
              <h2
                id="quiz-heading"
                className="font-serif text-2xl sm:text-3xl font-bold leading-tight break-keep"
              >
                {t('quiz.title')}
              </h2>
              <p className="text-xs text-white/80 font-light leading-relaxed break-keep">
                {t('quiz.desc')}
              </p>
            </div>

            <div className="pt-8 border-t border-white/10 hidden md:block">
              <p className="text-[11px] text-white/60">Atelier Crème Premium Engine</p>
            </div>
          </div>

          {/* Right Interactive quiz steps holder */}
          <div
            ref={stepRef}
            tabIndex={-1}
            aria-live="polite"
            className="md:col-span-3 p-8 sm:p-10 flex flex-col justify-center focus-visible:outline-none"
          >
            {quizStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-1.5 text-terracotta">
                  <span className="text-xs font-bold bg-terracotta/10 px-2 py-0.5 rounded">
                    STEP 01
                  </span>
                  <span className="text-xs font-semibold break-keep">{tq('step1Question')}</span>
                </div>

                <div className="space-y-3">
                  {STEP_1_VALUES.map((value, i) => (
                    <QuizOption
                      key={value}
                      label={tq(STEP_1_KEYS[i])}
                      onSelect={() => handleQuizAnswer(1, value)}
                    />
                  ))}
                </div>
              </div>
            )}

            {quizStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-1.5 text-terracotta">
                  <span className="text-xs font-bold bg-terracotta/10 px-2 py-0.5 rounded">
                    STEP 02
                  </span>
                  <span className="text-xs font-semibold break-keep">{tq('step2Question')}</span>
                </div>

                <div className="space-y-3">
                  {STEP_2_VALUES.map((value, i) => (
                    <QuizOption
                      key={value}
                      label={tq(STEP_2_KEYS[i])}
                      onSelect={() => handleQuizAnswer(2, value)}
                    />
                  ))}
                </div>
              </div>
            )}

            {quizStep === 3 && quizResult && (
              <div className="space-y-6">
                <div className="flex items-center gap-1.5 text-gold">
                  <span className="text-xs font-bold bg-gold/10 px-2 py-0.5 rounded">
                    MATCH COMPLETE
                  </span>
                  <span className="text-xs font-semibold break-keep">
                    {tq('resultLead')}
                  </span>
                </div>

                {/* Recommendation card shortcut */}
                <div className="p-4 bg-cream/50 rounded-2xl border border-brown-light flex gap-4 items-center">
                  <img
                    referrerPolicy="no-referrer"
                    src={quizResult.thumbnail}
                    alt=""
                    width={80}
                    height={80}
                    loading="lazy"
                    decoding="async"
                    className="w-20 h-20 rounded-lg object-cover border border-brown-light/80 shadow-card"
                  />
                  <div className="flex-1 space-y-1 min-w-0">
                    <span className="text-[11px] text-terracotta font-bold uppercase">
                      {quizResult.category}
                    </span>
                    <h3 className="font-serif text-sm font-bold text-brown leading-tight line-clamp-1">
                      {quizResult.title}
                    </h3>
                    <p className="text-[11px] text-brown-medium font-light">
                      {tq('resultInstructor')} <strong>{quizResult.instructor}</strong>{' '}
                      {tq('resultLevel', { level: quizResult.level })}
                    </p>

                    <div className="flex items-center gap-1 pt-1">
                      <Star size={11} className="text-gold fill-gold" />
                      <span className="text-[11px] text-brown-medium font-bold">
                        {quizResult.rating.toFixed(1)}
                      </span>
                      <span className="text-[11px] text-brown-medium/70">
                        {tq('resultReviews', { count: quizResult.reviewCount })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => router.push(`/classes/${quizResult.id}`)}
                  >
                    {tq('resultCta')}
                  </Button>
                  <Button variant="outline" onClick={resetQuiz}>
                    {tq('resultRetry')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
