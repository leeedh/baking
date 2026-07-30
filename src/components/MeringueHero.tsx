'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';

gsap.registerPlugin(ScrollTrigger);

interface MeringueHeroProps {
  /**
   * DC-96 · 히어로는 홈에 있고 클래스 그리드는 `/classes`로 빠졌다.
   * 검색어는 홈에 머무르지 않고 온라인 클래스 페이지로 넘긴다(`/classes?q=`).
   */
  onSearch: (query: string) => void;
  /** "클래스 탐색" — 온라인 클래스 목록으로 이동. */
  onExplore: () => void;
  /** "추천 퀴즈" — 온라인 클래스 페이지의 퀴즈 섹션으로 이동. */
  onQuiz: () => void;
}

export default function MeringueHero({ onSearch, onExplore, onQuiz }: MeringueHeroProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const t = useTranslations();
  const language = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const maskHoleRef = useRef<SVGCircleElement>(null);
  const bgImageRef = useRef<HTMLImageElement>(null);
  const decorRef = useRef<SVGGElement>(null);
  const textInitialRef = useRef<HTMLDivElement>(null);
  const textRevealRef = useRef<HTMLDivElement>(null);
  const bottomBarRef = useRef<HTMLDivElement>(null);
  const leftTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !maskHoleRef.current) return;

    // Respect reduced-motion preference: skip the scroll-pinned zoom entirely, keep the static hero layer
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Set initial transform origins for accurate central scaling
    gsap.set(maskHoleRef.current, { transformOrigin: '50% 50%' });
    if (decorRef.current) {
      gsap.set(decorRef.current, { transformOrigin: '50% 50%' });
    }
    if (bgImageRef.current) {
      gsap.set(bgImageRef.current, { transformOrigin: '50% 50%' });
    }

    // Create GSAP Timeline synchronized 1:1 with ScrollTrigger on a clean h-screen container
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: '+=2500', // Pinned for 3000px of scrolling to complete the zoom (slower reveal)
        scrub: 1.5, // Buttery smooth response
        pin: true, // Let ScrollTrigger handle pure pinning
        anticipatePin: 1,
      },
    });

    // 1. Zoom mask hole & rotate background image dynamically
    tl.to(
      maskHoleRef.current,
      {
        scale: 22, // Expands the 8% radius circle to fully cover the screen corners (176% width/height)
        ease: 'power1.out', // Gentler ramp than power2 — circle grows more evenly as you scroll
      },
      0,
    );

    if (decorRef.current) {
      tl.to(
        decorRef.current,
        {
          scale: 22,
          opacity: 0, // Gently fades out outline rings as they expand past margins
          ease: 'power1.out',
        },
        0,
      );
    }

    if (bgImageRef.current) {
      tl.fromTo(
        bgImageRef.current,
        { scale: 1.05 },
        {
          scale: 1.2, // rotation 제거 — 수평 케이크 이미지 기울기 방지
          ease: 'power1.out',
        },
        0,
      );
    }

    // 2. Smoothly fade out the central initial editorial content to keep the zoom-in visual clean
    if (leftTextRef.current) {
      tl.to(
        leftTextRef.current,
        {
          opacity: 0,
          y: -15,
          ease: 'power1.in', // 느리게 시작 → 초반 텍스트를 더 오래 유지
        },
        0,
      );
    }

    if (bottomBarRef.current) {
      tl.to(
        bottomBarRef.current,
        {
          opacity: 0,
          y: 20,
          ease: 'power1.in',
        },
        0,
      );
    }

    // 3. Fade out the initial premium light content container
    if (textInitialRef.current) {
      tl.to(
        textInitialRef.current,
        {
          opacity: 0,
          scale: 0.98,
          ease: 'power1.in', // 크로스페이드 구간 확보
        },
        0,
      );
    }

    // 4. Fade in the revealed full-screen branding/slogan — starts earlier to eliminate empty gap
    if (textRevealRef.current) {
      tl.fromTo(
        textRevealRef.current,
        { opacity: 0, y: 30, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          ease: 'power2.out',
          duration: 0.6,
        },
        0.25, // 0.4 → 0.25: 앞당겨 초기 텍스트와 크로스페이드 구간 확보
      );
    }

    return () => {
      // Cleanup ScrollTrigger to avoid context leaks
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  // 그리드·퀴즈가 /classes로 빠졌으므로 스크롤 대신 라우팅한다(호출부가 목적지를 정함).
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery.trim());
  };

  return (
    <div
      ref={containerRef}
      id="meringue-scroll-wrapper"
      // 100svh — 모바일 브라우저 UI 바가 접히며 h-screen이 튀는 문제를 피한다
      className="relative w-full h-screen min-h-[100svh] bg-ivory overflow-hidden"
    >
      {/* 
        ========================================================================
        ALWAYS VISIBLE FIXED TOP ACTION BAR (Does NOT fade out during zoom)
        Provides seamless search and category selection anywhere on the screen.
        ========================================================================
      */}
      <div
        id="hero-fixed-action-bar"
        className="absolute top-0 inset-x-0 z-30 bg-ivory/90 backdrop-blur-md border-b border-brown-light/70 py-3 px-4 sm:px-12 flex flex-col md:flex-row items-center justify-between gap-2.5 md:gap-4 shadow-sm pointer-events-auto"
      >
        {/* Left brand/slogan */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <span className="text-[10px] font-mono tracking-[0.25em] text-brown-deep uppercase font-bold">
            ATELIER CRÈME BY MIN SOHEE
          </span>
          <span className="h-[12px] w-[1px] bg-brown-light hidden sm:inline-block" />
          <span className="text-[9px] font-mono tracking-[0.15em] text-gold uppercase font-semibold hidden sm:inline-block">
            01 / THE ORIGINAL REAL TECHNIQUE
          </span>
        </div>

        {/* Right Search and Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto justify-end">
          {/* Search Input — 제출 시 /classes?q=로 이동한다 */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brown-deep/70">
              <Search size={13} />
            </span>
            <input
              id="catalog-search-input-fixed"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('hero.searchPlaceholder')}
              aria-label={t('hero.searchPlaceholder')}
              className="w-full pl-8 pr-3 py-2 min-h-[40px] bg-white/80 border border-brown-light rounded-lg text-xs text-hero-ink placeholder:text-brown-deep/60 transition-[border-color] hover:border-hero-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
          </form>

          {/* Quick Button Pair */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-center">
            <button
              type="button"
              onClick={onExplore}
              className="px-4 py-1.5 bg-hero-ink hover:bg-hero-accent text-cream text-xs font-bold rounded-lg transition-all duration-300 cursor-pointer shadow-sm whitespace-nowrap"
            >
              {t('hero.exploreBtn')}
            </button>

            <button
              type="button"
              onClick={onQuiz}
              className="px-3 py-1.5 bg-transparent border border-hero-ink/20 hover:border-hero-ink text-hero-ink text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap"
            >
              {t('hero.quizBtn')}
            </button>
          </div>
        </div>
      </div>

      {/* Underneath Visual: Gorgeous Full-Screen Cake/Meringue (revealed by masking) */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/*
          LCP 이미지 — priority로 프리로드한다. GSAP이 이 요소에 scale 트랜스폼을 걸므로
          ref는 실제 <img>를 가리켜야 해서 fill(단일 img 렌더) 형태를 쓴다.
        */}
        <Image
          ref={bgImageRef}
          referrerPolicy="no-referrer"
          src="https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&q=80&w=2000"
          alt="Artisan Gourmet Raspberry Cake Top-View"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center brightness-[0.82]"
        />
        {/* Soft dark gradient overlay to ensure revealed white text is fully legible */}
        <div className="absolute inset-0 bg-black/25 z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/55 z-10 pointer-events-none" />
      </div>

      {/* Soft Cream Overlay with SVG Mask (Cuts a perfect round cake hole) */}
      <div className="absolute inset-0 z-10 pointer-events-none select-none">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
          <defs>
            <mask id="cake-zoom-mask" maskUnits="userSpaceOnUse">
              <rect x="0" y="0" width="100" height="100" fill="white" />
              <circle ref={maskHoleRef} cx="50" cy="50" r="8" fill="black" />
            </mask>
          </defs>

          {/* Cream overlay — solid fill required; gradient fill breaks mask animation in browsers */}
          <rect
            x="0"
            y="0"
            width="100"
            height="100"
            fill="var(--color-ivory)"
            mask="url(#cake-zoom-mask)"
          />

          {/* Luxury concentric rings framing the circular cake window */}
          <g ref={decorRef} className="opacity-80">
            <circle
              cx="50"
              cy="50"
              r="8.4"
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth="0.28"
              opacity="0.9"
            />
            <circle
              cx="50"
              cy="50"
              r="9.6"
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth="0.16"
              strokeDasharray="0.55,0.55"
              opacity="0.7"
            />
            <circle
              cx="50"
              cy="50"
              r="11.2"
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth="0.09"
              opacity="0.45"
            />
            <circle
              cx="50"
              cy="50"
              r="13.5"
              fill="none"
              stroke="var(--color-hero-accent)"
              strokeWidth="0.05"
              opacity="0.22"
            />
          </g>
        </svg>
      </div>

      {/* Foreground Layer 1: Initial Editorial Content (Light Theme, Premium Dark Chocolate Text) */}
      <div
        ref={textInitialRef}
        className="absolute inset-0 z-20 max-w-7xl mx-auto w-full px-6 sm:px-12 flex flex-col justify-center pt-24 pb-16 pointer-events-auto"
      >
        {/* Asymmetrical Split Editorial Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left text column: Using Deep Chocolate colors */}
          <div
            ref={leftTextRef}
            className="lg:col-span-7 space-y-5 sm:space-y-6 transition-all duration-300"
          >
            <span className="text-gold text-[10px] sm:text-[11px] font-mono tracking-[0.4em] block font-bold uppercase">
              {t('hero.subtitle')}
            </span>

            <h1 className="font-serif text-3xl sm:text-5xl lg:text-[56px] font-light leading-[1.12] tracking-tight text-hero-ink space-y-1 sm:space-y-2 break-keep">
              <span className="block">{t('hero.title1')}</span>
              <span className="block font-medium font-serif text-hero-accent">
                {t('hero.title2')}
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-brown-deep leading-relaxed max-w-md font-light break-keep">
              {t('hero.desc')}
            </p>
          </div>

          {/* Right column: 에디토리얼 브랜드 스탯 패널 */}
          <div className="lg:col-span-5 hidden lg:flex flex-col items-end justify-center gap-6 pr-2">
            {/* 구분선 + 레이블 */}
            <div className="flex items-center gap-3 self-end">
              <div className="h-[1px] w-8 bg-gold/50" />
              <span className="text-[9px] font-mono tracking-[0.4em] text-gold uppercase font-bold">
                SINCE 2019 · PARIS
              </span>
            </div>

            {/* 스탯 카드 그리드 */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-[200px]">
              <div className="border border-brown-light p-3 rounded-sm bg-white/30 backdrop-blur-sm">
                <div className="font-serif text-2xl font-light text-hero-ink leading-none">42</div>
                <div className="text-[9px] font-mono tracking-[0.2em] text-brown-deep/70 uppercase mt-1">
                  Masterclasses
                </div>
              </div>
              <div className="border border-brown-light p-3 rounded-sm bg-white/30 backdrop-blur-sm">
                <div className="font-serif text-2xl font-light text-hero-ink leading-none">4.9</div>
                <div className="text-[9px] font-mono tracking-[0.2em] text-brown-deep/70 uppercase mt-1">
                  Avg Rating
                </div>
              </div>
              <div className="border border-brown-light p-3 rounded-sm bg-white/30 backdrop-blur-sm col-span-2">
                <div className="font-serif text-2xl font-light text-hero-ink leading-none">
                  4,800<span className="text-base">+</span>
                </div>
                <div className="text-[9px] font-mono tracking-[0.2em] text-brown-deep/70 uppercase mt-1">
                  Students Worldwide
                </div>
              </div>
            </div>

            {/* 수직 텍스트 장식 */}
            <div className="flex items-center gap-2 self-end opacity-40">
              <div className="h-12 w-[1px] bg-hero-ink" />
              <span
                className="text-[8px] font-mono tracking-[0.35em] text-hero-ink uppercase font-medium"
                style={{ writingMode: 'vertical-rl' }}
              >
                ATELIER CRÈME
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Indicator */}
        <div
          ref={bottomBarRef}
          className="absolute bottom-6 left-6 right-6 sm:left-12 sm:right-12 flex items-center justify-between border-t border-brown-light pt-4 text-[11px] text-brown-deep font-light transition-all duration-300"
        >
          <span>Scroll Down to Zoom Into the Secret Dessert Scene</span>
          {/* 마우스 아이콘 스크롤 힌트 */}
          <div className="flex flex-col items-center gap-1.5">
            <svg
              width="18"
              height="26"
              viewBox="0 0 18 26"
              fill="none"
              className="text-brown-deep/60"
            >
              <rect
                x="1"
                y="1"
                width="16"
                height="24"
                rx="8"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <rect
                x="8"
                y="5"
                width="2"
                height="5"
                rx="1"
                fill="var(--color-gold)"
                className="animate-mouse-scroll"
              />
            </svg>
            <span className="font-mono text-[10px] tracking-[0.35em] text-brown-deep/70 uppercase">
              SCROLL
            </span>
          </div>
        </div>
      </div>

      {/* Foreground Layer 2: Revealed Full-Screen Cinematic Slogan (Dark Theme, Crisp White Text) */}
      <div
        ref={textRevealRef}
        className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6 pointer-events-none select-none opacity-0"
      >
        <div className="max-w-3xl space-y-5">
          <span className="text-gold text-[10px] sm:text-[11px] font-mono tracking-[0.5em] block font-extrabold uppercase">
            THE SENSE OF ARTISAN MASTERY
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-light leading-tight text-white tracking-tight break-keep">
            {language === 'ko' ? (
              <>
                완벽한 텍스처를 향한 <br className="sm:hidden" />
                <span className="font-serif italic font-medium text-cream">
                  파티시에의 무한한 집념
                </span>
              </>
            ) : (
              <>
                An Infinite Obsession for <br className="sm:hidden" />
                <span className="font-serif italic font-medium text-cream">
                  the Absolute Perfect Texture
                </span>
              </>
            )}
          </h2>
          <div className="w-16 h-[1px] bg-gold mx-auto my-4" />
          <p className="text-xs sm:text-sm text-white/85 max-w-lg mx-auto font-light leading-relaxed tracking-wide break-keep">
            {language === 'ko'
              ? '아틀리에 크렘이 수년간 정교화한 오븐 기압 공식과 크림 마스킹 기술을 통해, 손가락 끝의 감각이 과학적 마스터피스가 되는 순간을 선사합니다.'
              : 'Discover the exact oven pressure formula and cream masking techniques perfected over years, transforming raw intuition into master-level French pastries.'}
          </p>
          <div className="pt-6 flex flex-col items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 border border-white/20 rounded-full bg-white/5 backdrop-blur-sm text-[10px] font-semibold text-white uppercase tracking-[0.2em]">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-ping" />
              Live VOD Streaming Active
            </span>
            {/* CTA 버튼 — pointer-events-auto로 클릭 가능하게 */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pointer-events-auto">
              <button
                type="button"
                onClick={onExplore}
                className="px-7 py-3 min-h-[44px] bg-gold hover:bg-gold-deep text-white text-[11px] font-bold tracking-[0.25em] uppercase rounded-full transition-all duration-300 shadow-lg shadow-gold/30 cursor-pointer"
              >
                {language === 'ko' ? '마스터클래스 탐색' : 'Explore Masterclasses'}
              </button>
              <button
                type="button"
                onClick={onExplore}
                className="px-5 py-3 min-h-[44px] border border-white/30 hover:border-white/60 text-white/80 hover:text-white text-[11px] font-medium tracking-[0.15em] uppercase rounded-full transition-all duration-300 cursor-pointer backdrop-blur-sm"
              >
                {language === 'ko' ? '무료 맛보기 시청' : 'Watch Free Preview'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
