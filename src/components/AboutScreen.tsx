'use client';

import { useRouter } from '@/i18n/navigation';
import { Award, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import NewsletterCTA from './sections/NewsletterCTA';
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
  const onNavigateToCatalog = () => router.push('/classes');
  const onNavigateToBooks = () => router.push('/books');

  const milestones = t.raw('milestones') as Milestone[];
  const philosophies = t.raw('philosophies') as Philosophy[];
  const qaList = t.raw('qa') as QA[];

  return (
    <div
      id="about-screen"
      className="bg-[#FAF4EA] min-h-screen text-[#2A211B] font-sans selection:bg-[#B65538]/20 selection:text-[#B65538]"
    >
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
                <p className="text-[10px] text-[#B0863C] font-semibold tracking-wider uppercase">
                  Directing Chef
                </p>
                <h4 className="font-serif text-base font-bold text-[#2A211B] mt-0.5">
                  {t('chefName')}
                </h4>
                <p className="text-[10px] text-[#5F4E43] font-light leading-relaxed mt-1">
                  {t('chefRole')}
                </p>
              </div>
            </div>
          </div>

          {/* Right Side: Philosophy & Bio Text */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B65538]/8 text-[#B65538] text-[11px] font-bold tracking-wider uppercase border border-[#B65538]/15 shadow-sm">
              <Sparkles size={12} className="text-[#B65538]" />
              {t('heroBadge')}
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#2A211B] leading-tight keep-all break-keep">
              {t('heroTitle')} <span className="font-serif italic text-[#B65538]">{t('heroTitleEm')}</span>
            </h1>

            <div className="text-sm sm:text-base text-[#5F4E43] font-light leading-relaxed keep-all break-keep">
              <p>{t('bio1')}</p>
              <p className="mt-3">{t('bio2')}</p>
              <p className="mt-3">{t('bio3')}</p>
            </div>

            {/* Quick interactive stats */}
            <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-[#EFE8DC] max-w-lg">
              <div>
                <p className="text-2xl font-serif font-extrabold text-[#B65538]">10,500+</p>
                <p className="text-[10.5px] text-[#5F4E43] font-light mt-0.5">{t('stat1')}</p>
              </div>
              <div>
                <p className="text-2xl font-serif font-extrabold text-[#B0863C]">100%</p>
                <p className="text-[10.5px] text-[#5F4E43] font-light mt-0.5">{t('stat2')}</p>
              </div>
              <div>
                <p className="text-2xl font-serif font-extrabold text-[#2A211B]">1:1</p>
                <p className="text-[10.5px] text-[#5F4E43] font-light mt-0.5">{t('stat3')}</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onNavigateToCatalog}
                className="px-6 py-3 bg-[#2A211B] hover:bg-[#B65538] text-white text-xs font-bold rounded-xl shadow-md transition-all duration-300"
              >
                {t('ctaClasses')}
              </button>
              <button
                type="button"
                onClick={onNavigateToBooks}
                className="px-6 py-3 bg-white border border-[#EFE8DC] hover:bg-[#FAF4EA] text-[#5F4E43] text-xs font-semibold rounded-xl transition-all"
              >
                {t('ctaBooks')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Philosophy — 홈에서 요약으로만 보던 3 pillars의 전문 (PRD-F-20) */}
      <PhilosophyPillars variant="full" />

      {/* Philosophy Details Section */}
      <section className="py-20 px-6 sm:px-12 max-w-7xl mx-auto border-b border-[#EFE8DC]/70">
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
          <span className="text-xs font-serif font-bold text-[#B0863C] tracking-[0.2em] uppercase">
            THE Core Values
          </span>
          <h2 className="font-serif text-3xl font-bold text-[#2A211B]">{t('philosophyTitle')}</h2>
          <p className="text-xs sm:text-sm text-[#5F4E43] font-light">{t('philosophyDesc')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {philosophies.map((phil, i) => (
            <div
              key={phil.title}
              className="bg-white rounded-2xl p-8 border border-[#EFE8DC] space-y-4 hover:shadow-lg transition-transform duration-300"
            >
              <div className="w-10 h-10 rounded-full bg-[#B65538]/10 text-[#B65538] flex items-center justify-center font-bold font-serif">
                0{i + 1}
              </div>
              <h3 className="font-serif text-lg font-bold text-[#2A211B]">{phil.title}</h3>
              <p className="text-xs sm:text-[13px] text-[#5F4E43] leading-relaxed font-light">
                {phil.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Chef Milestones & Careers Timeline */}
      <section className="py-20 px-6 sm:px-12 bg-white/60">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-3 mb-16">
            <Award className="mx-auto text-[#B0863C] animate-pulse" size={28} />
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2A211B]">
              {t('timelineTitle')}
            </h2>
            <p className="text-xs text-[#5F4E43] font-light">{t('timelineDesc')}</p>
          </div>

          <div className="relative border-l border-[#B0863C]/30 pl-6 sm:pl-8 space-y-10 py-2">
            {milestones.map((ms) => (
              <div key={ms.year} className="relative group">
                {/* Dots indicator */}
                <span className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full bg-[#B0863C] border-4 border-white shadow-md group-hover:bg-[#B65538] transition-colors" />

                <div className="space-y-1">
                  <span className="font-mono text-sm font-bold text-[#B0863C] block">
                    {ms.year}
                  </span>
                  <p className="text-sm font-serif font-medium text-[#2A211B] sm:text-base leading-relaxed">
                    {ms.event}
                  </p>
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
            <span className="text-[10px] bg-[#2A211B] text-white px-3 py-1 rounded font-bold tracking-widest uppercase">
              Deep Interview
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2A211B]">
              {t('qaTitle')}
            </h2>
            <p className="text-xs text-[#5F4E43] font-light">{t('qaDesc')}</p>
          </div>

          {qaList.map((qa) => (
            <div key={qa.q} className="space-y-4 border-b border-[#FAF4EA] pb-8 last:border-none">
              <div className="flex items-start gap-3">
                <span className="font-serif text-lg font-extrabold text-[#B65538] shrink-0 mt-0.5">
                  Q.
                </span>
                <h4 className="font-serif text-base sm:text-lg font-bold text-[#2A211B]">{qa.q}</h4>
              </div>
              <div className="flex items-start gap-3 pl-2 sm:pl-4 border-l-2 border-[#B0863C]/20 bg-[#FAF4EA]/40 p-4 rounded-xl">
                <span className="font-serif text-xs font-semibold text-stone-400 shrink-0 mt-1 uppercase">
                  ANSWER :
                </span>
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
            {t('bottomTitle')}
          </h3>
          <p className="text-xs sm:text-sm text-white/70 font-light leading-relaxed keep-all break-keep">
            {t('bottomDesc')}
          </p>

          <div className="flex justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={onNavigateToCatalog}
              className="px-6 py-2.5 bg-[#B65538] hover:bg-[#A0452C] text-[#FAF4EA] text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
            >
              {t('bottomCtaClasses')}
            </button>
            <button
              type="button"
              onClick={onNavigateToBooks}
              className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-[#FAF4EA] text-xs font-medium rounded-xl transition-colors cursor-pointer"
            >
              {t('bottomCtaBooks')}
            </button>
          </div>
        </div>
      </section>

      <NewsletterCTA />
    </div>
  );
}
