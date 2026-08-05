'use client';

import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatCount, formatKrw } from '@/lib/format';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CirclePlay,
  Clock,
  FileText,
  Gift,
  Lock,
  MessageSquare,
  Play,
  Shield,
  Sparkles,
  Star,
  User,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import React, { useState } from 'react';
import type { ClassItem, DetailChapter, MyReview, ReviewItem } from '../types';
import ReviewForm from './ReviewForm';

interface DetailScreenProps {
  /** 서버(course_catalog)에서 로드한 클래스 메타. */
  course: ClassItem;
  /** courses.id(uuid) — 후기 API용. course.id는 라우팅 키인 slug다. */
  courseId: string;
  /** 서버(lessons)에서 로드한 커리큘럼(잠긴 차시 포함). */
  chapters: DetailChapter[];
  /** 서버(reviews)에서 로드한 후기 목록. */
  reviews: ReviewItem[];
  /** 후기 작성 자격(활성 수강권 보유). */
  canReview: boolean;
  /** 이미 작성한 본인 후기(없으면 null). */
  myReview: MyReview | null;
  /** 서버에서 enrollments로 판별한 활성 수강권 보유 여부 */
  purchased: boolean;
}

export default function DetailScreen({
  course,
  courseId,
  chapters,
  reviews,
  canReview,
  myReview,
  purchased,
}: DetailScreenProps) {
  const cls = course;
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const t = useTranslations('detail');
  const locale = useLocale() as 'ko' | 'en';

  // 목록 본체는 /classes다 — 홈은 브랜드 게이트웨이라 그리드가 없다(DC-96, 코드리뷰 M-9).
  const onNavigateToCatalog = () => router.push('/classes');
  const onNavigateToPayment = (id: string) => {
    if (!isLoggedIn) {
      alert(t('loginRequired'));
      router.push('/login');
      return;
    }
    router.push(`/checkout/${id}`);
  };
  const onStartPreview = (classIdArg: string, lessonId: string) => {
    router.push(`/learn/${classIdArg}?lesson=${lessonId}`);
  };

  const [activeTab, setActiveTab] = useState<'intro' | 'curriculum' | 'reviews'>('intro');

  const curriculum = chapters;

  // Total lessons count
  const totalLessons = curriculum.reduce((acc, curr) => acc + curr.lessons.length, 0);

  // 첫 미리보기 차시 / 첫 차시 — 서버가 내려준 is_preview 기준(클라이언트 단독 가드 없음).
  // 미리보기 차시가 없으면 firstPreviewLessonId는 빈 값 → 미리보기 CTA는 disabled 처리(잠긴
  // 차시로 보내지 않는다).
  const allLessons = curriculum.flatMap((ch) => ch.lessons);
  const firstPreviewLessonId = allLessons.find((l) => l.isPreview)?.id ?? '';
  const firstLessonId = allLessons[0]?.id ?? '';

  // 정가(list_price)가 판매가보다 클 때만 할인/취소선 노출 — 정가 미설정 시 0%·NaN% 표기 방지.
  const discountPercent =
    cls.originalPrice > cls.price ? Math.round((1 - cls.price / cls.originalPrice) * 100) : 0;

  return (
    <div id="detail-screen" className="bg-cream py-8 px-4 sm:px-8 max-w-7xl mx-auto pb-28 lg:pb-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-brown-medium mb-6">
        <button
          type="button"
          onClick={onNavigateToCatalog}
          className="hover:underline cursor-pointer rounded px-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {t('breadcrumbHome')}
        </button>
        <ChevronRight size={12} />
        <span className="font-semibold text-terracotta">{cls.category}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Area: Video preview, title metadata, description, tabs */}
        <div className="lg:col-span-8 space-y-6">
          {/* 16:9 Cover Video / Image Preview */}
          <div
            id="cover-video-wrapper"
            className="relative aspect-[16/9] bg-black rounded-2xl overflow-hidden shadow-lg border-2 border-white group"
          >
            <img
              referrerPolicy="no-referrer"
              src={cls.thumbnail}
              alt={cls.title}
              className="w-full h-full object-cover brightness-75 group-hover:scale-101 transition-transform duration-500"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/30">
              {/* 미리보기 재생은 서버 게이팅되는 학습 페이지(재생 토큰 API가 is_preview 검증)로 이동. */}
              <button
                onClick={() => onStartPreview(cls.id, firstPreviewLessonId)}
                disabled={!firstPreviewLessonId}
                className="w-16 h-16 rounded-full bg-terracotta/90 hover:bg-terracotta text-cream flex items-center justify-center shadow-2xl hover:scale-110 transition-transform cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play size={26} className="ml-1 fill-white" />
              </button>
              <span className="mt-3 text-xs bg-black/60 backdrop-blur-md text-cream px-3 py-1 rounded-full font-medium tracking-wide">
                {t('previewCta')}
              </span>
            </div>

            {/* Corner Badge */}
            <span className="absolute top-4 left-4 bg-gold text-white text-xs font-bold px-3 py-1 rounded-md shadow-md uppercase tracking-wider">
              {t('levelBadge', { level: cls.level })}
            </span>
          </div>

          {/* Title & Instructor information */}
          <div className="space-y-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-brown leading-snug">
              {cls.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs font-sans text-brown-medium">
              <div className="flex items-center gap-1.5 font-bold text-gold">
                <Star size={14} className="fill-gold" />
                <span>{t('ratingSummary', { rating: cls.rating, count: cls.reviewCount })}</span>
              </div>
              <span>•</span>
              <span>{t('studentsCount', { count: formatCount(cls.studentsCount, locale) })}</span>
            </div>

            {/* Micro card of instructor */}
            <div className="flex items-center gap-4 p-4 bg-white border border-brown-light rounded-xl mt-4">
              <div className="w-12 h-12 rounded-full bg-gold/10 border-2 border-gold/30 flex items-center justify-center font-serif text-gold font-bold text-lg">
                Chef
              </div>
              <div>
                <h4 className="text-sm font-bold text-brown">
                  {t('chefName', { name: cls.instructor })}
                </h4>
                <p className="text-xs text-brown-medium mt-0.5">{cls.instructorTitle}</p>
              </div>
            </div>
          </div>

          {/* Tab buttons switcher */}
          <div className="flex border-b border-brown-light bg-white rounded-t-xl p-1 mt-6">
            <button
              onClick={() => setActiveTab('intro')}
              className={`flex-1 py-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'intro'
                  ? 'bg-cream text-terracotta shadow-sm'
                  : 'text-brown-medium/70 hover:text-brown-medium'
              } flex items-center justify-center gap-1.5`}
            >
              <Sparkles size={14} />
              {t('tabIntro')}
            </button>
            <button
              id="detail-tab-curriculum"
              onClick={() => setActiveTab('curriculum')}
              className={`flex-1 py-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'curriculum'
                  ? 'bg-cream text-terracotta shadow-sm'
                  : 'text-brown-medium/70 hover:text-brown-medium'
              } flex items-center justify-center gap-1.5`}
            >
              <BookOpen size={14} />
              {t('tabCurriculum', { count: totalLessons })}
            </button>
            <button
              id="detail-tab-reviews"
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 py-3 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'reviews'
                  ? 'bg-cream text-terracotta shadow-sm'
                  : 'text-brown-medium/70 hover:text-brown-medium'
              } flex items-center justify-center gap-1.5`}
            >
              <MessageSquare size={14} />
              {t('tabReviews', { count: reviews.length })}
            </button>
          </div>

          {/* Tab content renders */}
          <div className="bg-white p-6 rounded-b-xl border border-t-0 border-brown-light min-h-[300px]">
            {/* TAB 1: INTRO */}
            {activeTab === 'intro' && (
              <div className="space-y-6 text-sm text-brown leading-relaxed font-light">
                <div>
                  <h3 className="font-serif text-lg font-bold text-gold mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-gold rounded-full inline-block" />
                    {t('introHeading')}
                  </h3>
                  <p className="text-brown-medium font-light leading-relaxed">{cls.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 bg-cream/40 rounded-xl border border-brown-light">
                    <h4 className="font-bold text-xs text-terracotta uppercase mb-2">
                      {t('recipeHeading')}
                    </h4>
                    <ul className="space-y-1.5 text-xs text-brown-medium">
                      {(t.raw('recipeItems') as string[]).map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 bg-cream/40 rounded-xl border border-brown-light">
                    <h4 className="font-bold text-xs text-gold uppercase mb-2">
                      {t('benefitHeading')}
                    </h4>
                    <ul className="space-y-1.5 text-xs text-brown-medium">
                      {(t.raw('benefitItems') as string[]).map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4">
                  <h3 className="font-serif text-lg font-bold text-terracotta mb-2">
                    {t('noticeHeading')}
                  </h3>
                  <p className="text-xs text-brown-medium leading-relaxed">
                    {t('noticeBody')}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: CURRICULUM */}
            {activeTab === 'curriculum' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-cream p-3 rounded-lg border border-brown-light mb-2">
                  <span className="text-xs font-semibold text-terracotta">
                    {t('previewNotice')}
                  </span>
                </div>

                <div className="space-y-4">
                  {curriculum.map((chapter) => (
                    <div
                      key={chapter.id}
                      className="border border-brown-light rounded-xl overflow-hidden shadow-sm"
                    >
                      <div className="bg-cream/50 p-4 border-b border-brown-light flex justify-between items-center">
                        <h4 className="font-serif text-sm font-bold text-brown">{chapter.title}</h4>
                        <span className="text-[11px] text-gold font-semibold">
                          {t('chapterLessons', { count: chapter.lessons.length })}
                        </span>
                      </div>

                      <div className="divide-y divide-brown-light">
                        {chapter.lessons.map((lesson) => {
                          const isFreePreview = lesson.isPreview;
                          return (
                            <div
                              key={lesson.id}
                              className={`p-4 flex items-center justify-between text-xs sm:text-sm hover:bg-cream/20 transition-colors ${
                                isFreePreview ? 'bg-gold/5 font-medium' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {isFreePreview ? (
                                  <span className="text-terracotta animate-pulse">
                                    <CirclePlay size={18} />
                                  </span>
                                ) : (
                                  <span className="text-brown-medium/60">
                                    <Lock size={16} />
                                  </span>
                                )}
                                <div>
                                  <span className="text-xs text-brown">{lesson.title}</span>
                                  {isFreePreview && (
                                    <span className="ml-2 inline-block bg-terracotta text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                                      {t('freeBadge')}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-xs text-brown-medium font-mono">
                                  <Clock size={11} className="inline mr-0.5" />
                                  {lesson.duration}
                                </span>
                                {isFreePreview ? (
                                  <button
                                    id={`preview-btn-${lesson.id}`}
                                    onClick={() => onStartPreview(cls.id, lesson.id)}
                                    className="px-3 py-2 min-h-[36px] bg-terracotta hover:bg-terracotta-deep text-cream text-xs font-bold rounded cursor-pointer"
                                  >
                                    {t('watchNow')}
                                  </button>
                                ) : (
                                  <span className="text-xs text-brown-medium/50">{t('locked')}</span>
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
                <div className="flex items-center gap-4 bg-cream p-4 rounded-xl border border-brown-light mb-4">
                  <div className="text-center p-2">
                    <span className="block text-3xl font-serif font-extrabold text-terracotta">
                      {cls.rating}
                    </span>
                    <span className="text-[10px] text-brown-medium">{t('ratingLabel')}</span>
                  </div>
                  <div className="h-10 w-px bg-brown-light" />
                  <p className="text-xs text-brown-medium leading-relaxed break-keep">
                    {t('reviewsIntro')}
                  </p>
                </div>

                {/* key: 서버가 내려준 후기가 바뀌면 폼 입력 상태를 새로 초기화한다. */}
                <ReviewForm
                  key={myReview?.id ?? 'new'}
                  courseId={courseId}
                  canReview={canReview}
                  myReview={myReview}
                />

                <div className="space-y-4 divide-y divide-brown-light">
                  {reviews.length === 0 ? (
                    <div className="text-center py-8 text-xs text-brown-medium/60">
                      {t('reviewsEmpty')}
                    </div>
                  ) : (
                    reviews.map((rev) => (
                      <div key={rev.id} className="pt-4 space-y-2 first:pt-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img
                              referrerPolicy="no-referrer"
                              src={rev.avatar}
                              alt={rev.userName}
                              className="w-8 h-8 rounded-full border border-brown-light"
                            />
                            <div>
                              <span className="text-xs font-bold text-brown">{rev.userName}</span>
                              <div className="flex items-center text-gold transform scale-90 -translate-x-1.5">
                                {[1, 2, 3, 4, 5].map((starPosition) => (
                                  <Star
                                    key={starPosition}
                                    size={10}
                                    className={
                                      starPosition <= rev.rating ? 'fill-gold' : 'opacity-20'
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-brown-medium/60 font-mono">
                            {rev.date}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-brown-medium leading-relaxed font-light pl-10">
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
          <div className="bg-white rounded-2xl border-2 border-terracotta p-6 shadow-xl space-y-6">
            <div className="inline-block bg-terracotta/10 text-terracotta text-[10px] font-bold px-3 py-1 rounded-md uppercase tracking-wider">
              {t('passBadge')}
            </div>

            <div className="space-y-1">
              {discountPercent > 0 && (
                <span className="block text-xs text-brown-medium/70 line-through">
                  {formatKrw(cls.originalPrice, locale)}
                </span>
              )}
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-serif font-extrabold text-brown">
                  {formatKrw(cls.price, locale)}
                </span>
                <span className="text-sm font-bold text-gold">{t('vatIncluded')}</span>
              </div>
              {discountPercent > 0 && (
                <p className="text-[11px] text-terracotta font-bold">
                  {t('discountNote', { percent: discountPercent })}
                </p>
              )}
            </div>

            <div className="h-px bg-brown-light" />

            {/* Lifetime Access highlights */}
            <div className="space-y-3">
              {(t.raw('perks') as string[]).map((perk) => (
                <div key={perk} className="flex items-start gap-2 text-xs text-brown-medium">
                  <CheckCircle2 size={15} className="text-terracotta mt-0.5 shrink-0" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>

            {/* CTA Buy Buttons */}
            {purchased ? (
              <div className="space-y-2">
                <div className="bg-emerald-50 text-emerald-800 p-2 text-xs rounded text-center font-medium border border-emerald-200">
                  {t('ownedNotice')}
                </div>
                <button
                  onClick={() => onStartPreview(cls.id, firstLessonId)}
                  className="w-full py-3 bg-brown hover:bg-terracotta text-white font-bold text-xs sm:text-sm rounded-xl shadow transition-colors cursor-pointer text-center block"
                >
                  {t('goToPlayer')}
                </button>
              </div>
            ) : (
              <button
                id="btn-buy-now"
                onClick={() => onNavigateToPayment(cls.id)}
                className="w-full py-3.5 bg-terracotta hover:bg-terracotta-deep text-cream font-extrabold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer text-center block"
              >
                {t('buyNow')}
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
              className="w-full py-2 bg-transparent hover:bg-cream text-brown-medium font-semibold text-xs rounded-lg border border-brown-light transition-colors cursor-pointer text-center block"
            >
              {t('previewFirst')}
            </button>

            <p className="text-[10px] text-center text-brown-medium/60 leading-normal">
              {t('refundNote')}
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Row for Quick Purchase Conversion on Mobile Devices */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-brown-light p-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-8px_20px_rgba(42,33,27,0.08)] flex items-center justify-between gap-3 px-4">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-terracotta uppercase tracking-wider">
            LIFETIME ACCESS PASS
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-serif font-extrabold text-brown">
              {formatKrw(cls.price, locale)}
            </span>
            {discountPercent > 0 && (
              <span className="text-[10px] text-gold font-bold">
                {t('discountBadge', { percent: discountPercent })}
              </span>
            )}
          </div>
        </div>

        {purchased ? (
          <button
            onClick={() => onStartPreview(cls.id, curriculum[0]?.lessons[0]?.id || '')}
            className="px-5 py-3 min-h-[44px] bg-brown text-white font-bold text-xs rounded-xl shadow cursor-pointer text-center whitespace-nowrap"
          >
            {t('goToPlayerShort')}
          </button>
        ) : (
          <button
            id="mobile-sticky-buy"
            onClick={() => onNavigateToPayment(cls.id)}
            className="px-6 py-3 min-h-[44px] bg-terracotta hover:bg-terracotta-deep text-cream font-extrabold text-xs rounded-xl shadow-md text-center whitespace-nowrap cursor-pointer"
          >
            {t('buyNowShort')}
          </button>
        )}
      </div>
    </div>
  );
}
