'use client';

import Button from '@/components/ui/Button';
import { useRouter } from '@/i18n/navigation';
import { Award } from 'lucide-react';
import { useTranslations } from 'next-intl';
import PhilosophyPillars from './sections/PhilosophyPillars';

interface Milestone {
  year: string;
  event: string;
}
interface Philosophy {
  title: string;
  desc: string;
}
interface QA {
  q: string;
  a: string;
}

// DC-96 (PRD-F-20) · 소개(About) = 브랜드 철학 전문 + 셰프 프로필·연혁·인터뷰 + 도서 CTA.
// PRD-F-18(강사 소개)를 흡수했다 — 기존 /instructor는 이 화면으로 리다이렉트된다.
export default function AboutScreen() {
  const router = useRouter();
  const t = useTranslations('instructor');
  const tc = useTranslations('common');
  const onNavigateToCatalog = () => router.push('/classes');
  const onNavigateToBooks = () => router.push('/books');

  const milestones = t.raw('milestones') as Milestone[];
  const philosophies = t.raw('philosophies') as Philosophy[];
  const qaList = t.raw('qa') as QA[];

  return (
    <div
      id="about-screen"
      className="bg-cream min-h-screen text-brown font-sans selection:bg-terracotta/20 selection:text-terracotta"
    >
      {/*
        히어로 — Hallmark Stage: 왼쪽 초상, 오른쪽에 h1·한 문장·행동 둘.
        예전에는 행동 앞에 텍스트 블록이 12개였다(게이트 58). bio2·bio3과 수치는
        바로 아래 '셰프 이야기'로 자리만 옮겼다(문구·수치는 그대로).
      */}
      <section
        aria-labelledby="about-hero-heading"
        className="relative pt-8 sm:pt-12 pb-16 sm:pb-20 px-4 sm:px-12 max-w-7xl mx-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-[340px] sm:max-w-[380px]">
              <div aria-hidden className="absolute inset-4 bg-gold/10 rounded-2xl rotate-3 -z-10" />

              {/*
                셰프 초상 자리 — 실제 사진을 받기 전까지 스톡 인물 사진 대신 이니셜 표지를 둔다.
                사진이 생기면 이 div 안에 <img alt={tc('chefPortraitAria')}>를 다시 넣을 것.
              */}
              <div
                role="img"
                aria-label={tc('chefPortraitAria')}
                className="aspect-[3/4] rounded-2xl overflow-hidden shadow-panel border-4 border-white bg-brown flex items-center justify-center -rotate-1"
              >
                <span aria-hidden className="font-serif text-7xl sm:text-8xl font-bold text-gold">
                  {tc('chefMonogram')}
                </span>
              </div>

              {/* 모바일에서는 오른쪽으로 걸치면 뷰포트 밖으로 8px 넘쳤다 — sm부터만 바깥으로 뺀다. */}
              <div className="absolute -bottom-6 right-0 sm:-right-6 bg-white p-5 rounded-xl shadow-panel border border-brown-light/80 max-w-[190px]">
                <p className="text-[11px] text-gold-deep font-semibold">Directing Chef</p>
                <p className="font-serif text-base font-bold text-brown mt-0.5">{t('chefName')}</p>
                <p className="text-xs text-brown-medium font-light leading-relaxed mt-1">
                  {t('chefRole')}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <h1
              id="about-hero-heading"
              className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-brown leading-tight break-keep [overflow-wrap:break-word] min-w-0"
            >
              {t('heroTitle')} {t('heroTitleEm')}
            </h1>
            <p className="text-base sm:text-lg text-brown-medium font-light leading-relaxed break-keep max-w-[52ch]">
              {t('bio1')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button size="lg" onClick={onNavigateToCatalog}>
                {t('ctaClasses')}
              </Button>
              <Button size="lg" variant="outline" onClick={onNavigateToBooks}>
                {t('ctaBooks')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 셰프 이야기 — Split 텍스트(머리 4열 · 본문 8열) 아래 Figures(hairline 구분). */}
      <section
        aria-labelledby="about-story-heading"
        className="py-20 px-6 sm:px-12 bg-white/70 border-y border-brown-light"
      >
        <div className="max-w-7xl mx-auto space-y-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            <h2
              id="about-story-heading"
              className="lg:col-span-4 font-serif text-3xl sm:text-4xl font-bold text-brown leading-tight break-keep"
            >
              {t('storyTitle')}
            </h2>
            <div className="lg:col-span-8 space-y-4 text-sm sm:text-base text-brown-medium font-light leading-relaxed break-keep max-w-[65ch]">
              <p>{t('bio2')}</p>
              <p>{t('bio3')}</p>
            </div>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-3 border-t border-brown-light">
            <div className="py-6 sm:pr-8 border-b sm:border-b-0 sm:border-r border-brown-light">
              <dt className="text-sm text-brown-medium">{t('stat1')}</dt>
              <dd className="mt-2 font-serif text-4xl sm:text-5xl font-bold text-terracotta-deep tabular-nums">
                10,500+
              </dd>
            </div>
            <div className="py-6 sm:px-8 border-b sm:border-b-0 sm:border-r border-brown-light">
              <dt className="text-sm text-brown-medium">{t('stat2')}</dt>
              <dd className="mt-2 font-serif text-4xl sm:text-5xl font-bold text-gold-deep tabular-nums">
                100%
              </dd>
            </div>
            <div className="py-6 sm:pl-8">
              <dt className="text-sm text-brown-medium">{t('stat3')}</dt>
              <dd className="mt-2 font-serif text-4xl sm:text-5xl font-bold text-brown tabular-nums">
                1:1
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Brand Philosophy — 홈에서 요약으로만 보던 3 pillars의 전문 (PRD-F-20) */}
      <PhilosophyPillars variant="full" />

      {/* Philosophy Details Section */}
      <section
        aria-labelledby="about-values-heading"
        className="py-20 px-6 sm:px-12 max-w-7xl mx-auto border-b border-brown-light/70"
      >
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
          <h2
            id="about-values-heading"
            className="font-serif text-3xl font-bold text-brown break-keep"
          >
            {t('philosophyTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-brown-medium font-light">{t('philosophyDesc')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {philosophies.map((phil, i) => (
            <div
              key={phil.title}
              className="bg-white rounded-card p-8 border border-brown-light space-y-4 hover:shadow-card-hover hover:-translate-y-0.5 transition-[box-shadow,transform] duration-300 ease-out-soft"
            >
              <div className="w-10 h-10 rounded-full bg-terracotta/10 text-terracotta flex items-center justify-center font-bold font-serif">
                0{i + 1}
              </div>
              <h3 className="font-serif text-lg font-bold text-brown">{phil.title}</h3>
              <p className="text-xs sm:text-[13px] text-brown-medium leading-relaxed font-light">
                {phil.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Chef Milestones & Careers Timeline */}
      <section aria-labelledby="about-timeline-heading" className="py-20 px-6 sm:px-12 bg-white/60">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-3 mb-16">
            <Award className="mx-auto text-gold-deep animate-pulse" size={28} />
            <h2
              id="about-timeline-heading"
              className="font-serif text-2xl sm:text-3xl font-bold text-brown"
            >
              {t('timelineTitle')}
            </h2>
            <p className="text-xs text-brown-medium font-light">{t('timelineDesc')}</p>
          </div>

          <div className="relative border-l border-gold/30 pl-6 sm:pl-8 space-y-10 py-2">
            {milestones.map((ms) => (
              <div key={ms.year} className="relative group">
                {/* Dots indicator */}
                <span className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full bg-gold border-4 border-white shadow-md group-hover:bg-terracotta transition-colors" />

                <div className="space-y-1">
                  <span className="font-mono text-sm font-bold text-gold-deep block">
                    {ms.year}
                  </span>
                  <p className="text-sm font-serif font-medium text-brown sm:text-base leading-relaxed">
                    {ms.event}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interview / Deep QA Dialogue Section */}
      <section
        aria-labelledby="about-qa-heading"
        className="py-20 px-6 sm:px-12 bg-white/80 border-t border-brown-light"
      >
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="text-center space-y-2 mb-12">
            <h2
              id="about-qa-heading"
              className="font-serif text-2xl sm:text-3xl font-bold text-brown"
            >
              {t('qaTitle')}
            </h2>
            <p className="text-xs text-brown-medium font-light">{t('qaDesc')}</p>
          </div>

          {qaList.map((qa) => (
            <div key={qa.q} className="space-y-4 border-b border-cream pb-8 last:border-none">
              <div className="flex items-start gap-3">
                <span className="font-serif text-lg font-extrabold text-terracotta shrink-0 mt-0.5">
                  Q.
                </span>
                <h4 className="font-serif text-base sm:text-lg font-bold text-brown">{qa.q}</h4>
              </div>
              <div className="flex items-start gap-3 pl-2 sm:pl-4 border-l-2 border-gold/20 bg-cream/40 p-4 rounded-xl">
                <span className="font-serif text-lg font-extrabold text-gold-deep shrink-0">
                  A.
                </span>
                <p className="text-brown-medium text-sm font-light leading-relaxed">{qa.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA board for Sowoo Kim */}
      <section
        aria-labelledby="about-cta-heading"
        className="py-16 bg-brown text-cream text-center px-6"
      >
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-full bg-cream/10 mx-auto flex items-center justify-center text-gold border border-gold/30 text-xl font-serif font-bold">
            MC
          </div>
          <h3
            id="about-cta-heading"
            className="font-serif text-2xl sm:text-3xl font-bold break-keep"
          >
            {t('bottomTitle')}
          </h3>
          <p className="text-xs sm:text-sm text-white/70 font-light leading-relaxed break-keep">
            {t('bottomDesc')}
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={onNavigateToCatalog}
              className="px-6 py-2.5 min-h-[44px] whitespace-nowrap bg-terracotta hover:bg-terracotta-deep text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
            >
              {t('bottomCtaClasses')}
            </button>
            <button
              type="button"
              onClick={onNavigateToBooks}
              className="px-6 py-2.5 min-h-[44px] whitespace-nowrap bg-white/10 hover:bg-white/20 text-cream text-xs font-medium rounded-xl transition-colors cursor-pointer"
            >
              {t('bottomCtaBooks')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
