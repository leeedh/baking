import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Search, ChevronDown, Sparkles } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

gsap.registerPlugin(ScrollTrigger);

interface MeringueHeroProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function MeringueHero({ searchQuery, setSearchQuery }: MeringueHeroProps) {
  const { t, language } = useLanguage();
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
    tl.to(maskHoleRef.current, {
      scale: 22, // Expands the 8% radius circle to fully cover the screen corners (176% width/height)
      ease: 'power1.out', // Gentler ramp than power2 — circle grows more evenly as you scroll
    }, 0);

    if (decorRef.current) {
      tl.to(decorRef.current, {
        scale: 22,
        opacity: 0, // Gently fades out outline rings as they expand past margins
        ease: 'power1.out',
      }, 0);
    }

    if (bgImageRef.current) {
      tl.fromTo(bgImageRef.current, 
        { scale: 1.05, rotation: 0 },
        { 
          scale: 1.25, 
          rotation: 4, // Elegant 3D camera twist during zoom
          ease: 'power1.out' 
        }, 
        0
      );
    }

    // 2. Smoothly fade out the central initial editorial content to keep the zoom-in visual clean
    if (leftTextRef.current) {
      tl.to(leftTextRef.current, {
        opacity: 0,
        y: -15,
        ease: 'power1.inOut'
      }, 0);
    }

    if (bottomBarRef.current) {
      tl.to(bottomBarRef.current, {
        opacity: 0,
        y: 20,
        ease: 'power1.inOut'
      }, 0);
    }

    // 3. Fade out the initial premium light content container
    if (textInitialRef.current) {
      tl.to(textInitialRef.current, {
        opacity: 0,
        scale: 0.98,
        ease: 'power1.out',
      }, 0);
    }

    // 4. Fade in the gorgeous revealed full-screen branding/slogan inside the cake scene near the end of zoom
    if (textRevealRef.current) {
      tl.fromTo(textRevealRef.current, 
        { opacity: 0, y: 30, scale: 0.98 },
        { 
          opacity: 1, 
          y: 0, 
          scale: 1,
          ease: 'power2.out',
          duration: 0.5
        }, 
        0.4
      );
    }

    return () => {
      // Cleanup ScrollTrigger to avoid context leaks
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  const handleExploreClick = () => {
    const element = document.getElementById('catalog-grid-anchor');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleQuizClick = () => {
    const element = document.getElementById('baking-quiz-section');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div 
      ref={containerRef} 
      id="meringue-scroll-wrapper" 
      className="relative w-full h-screen bg-[#FDFBF7] overflow-hidden"
    >
      {/* 
        ========================================================================
        ALWAYS VISIBLE FIXED TOP ACTION BAR (Does NOT fade out during zoom)
        Provides seamless search and category selection anywhere on the screen.
        ========================================================================
      */}
      <div 
        id="hero-fixed-action-bar" 
        className="absolute top-0 inset-x-0 z-30 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-[#EFE8DC]/70 py-3.5 px-6 sm:px-12 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm pointer-events-auto"
      >
        {/* Left brand/slogan */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] font-mono tracking-[0.25em] text-[#4A3225] uppercase font-bold">
            ATELIER CRÈME BY MIN SOHEE
          </span>
          <span className="h-[12px] w-[1px] bg-[#EFE8DC] hidden sm:inline-block" />
          <span className="text-[9px] font-mono tracking-[0.15em] text-[#B0863C] uppercase font-semibold hidden sm:inline-block">
            01 / THE ORIGINAL REAL TECHNIQUE
          </span>
        </div>

        {/* Right Search and Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto justify-end">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#4E3C30]/60">
              <Search size={13} />
            </span>
            <input
              id="catalog-search-input-fixed"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('hero.searchPlaceholder')}
              className="w-full pl-8 pr-3 py-1.5 bg-white/80 border border-[#EFE8DC] rounded-lg text-xs text-[#2C1A12] placeholder-[#4E3C30]/50 focus:outline-none focus:ring-1 focus:ring-[#9E2D1B] focus:border-[#9E2D1B] transition-all"
            />
          </div>

          {/* Quick Button Pair */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-center">
            <button 
              onClick={handleExploreClick} 
              className="px-4 py-1.5 bg-[#2C1A12] hover:bg-[#9E2D1B] text-[#FAF4EA] text-xs font-bold rounded-lg transition-all duration-300 cursor-pointer shadow-sm whitespace-nowrap"
            >
              {t('hero.exploreBtn')}
            </button>
            
            <button 
              onClick={handleQuizClick}
              className="px-3 py-1.5 bg-transparent border border-[#2C1A12]/20 hover:border-[#2C1A12] text-[#2C1A12] text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap"
            >
              {t('hero.quizBtn')}
            </button>
          </div>
        </div>
      </div>

      {/* Underneath Visual: Gorgeous Full-Screen Cake/Meringue (revealed by masking) */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img 
          ref={bgImageRef}
          referrerPolicy="no-referrer"
          src="https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&q=80&w=2000" 
          alt="Artisan Gourmet Raspberry Cake Top-View" 
          className="w-full h-full object-cover object-center brightness-[0.82]"
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
              {/* White rectangle covers everything (Overlay is visible) */}
              <rect x="0" y="0" width="100" height="100" fill="white" />
              
              {/* Perfect circular hole cutting the mask to reveal the top-view cake below */}
              <circle 
                ref={maskHoleRef}
                cx="50"
                cy="50"
                r="8"
                fill="black"
              />
            </mask>
          </defs>
          
          {/* Soft Cream Overlay Rect with the mask applied */}
          <rect x="0" y="0" width="100" height="100" fill="#FDFBF7" mask="url(#cake-zoom-mask)" />
          
          {/* Elegant luxury concentric guidelines framing the circular cake (scales in sync) */}
          <g ref={decorRef} className="opacity-70">
            <circle cx="50" cy="50" r="8.3" fill="none" stroke="#B0863C" strokeWidth="0.15" />
            <circle cx="50" cy="50" r="9.2" fill="none" stroke="#B0863C" strokeWidth="0.08" strokeDasharray="0.3,0.3" opacity="0.7" />
            <circle cx="50" cy="50" r="10.5" fill="none" stroke="#B0863C" strokeWidth="0.05" opacity="0.4" />
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
          <div ref={leftTextRef} className="lg:col-span-7 space-y-5 sm:space-y-6 transition-all duration-300">
            <span className="text-[#B0863C] text-[10px] sm:text-[11px] font-mono tracking-[0.4em] block font-bold uppercase">
              {t('hero.subtitle')}
            </span>
            
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-[56px] font-light leading-[1.12] tracking-tight text-[#2C1A12] space-y-1 sm:space-y-2 keep-all break-keep">
              <span className="block">{t('hero.title1')}</span>
              <span className="block font-medium font-serif text-[#9E2D1B]">{t('hero.title2')}</span>
            </h1>

            <p className="text-xs sm:text-sm text-[#4E3C30] leading-relaxed max-w-md font-light keep-all break-keep">
              {t('hero.desc')}
            </p>
          </div>

          {/* Right Display frame detailing the Interactive top-view cake guide */}
          <div className="lg:col-span-5 hidden lg:flex flex-col items-center justify-center p-6 relative">
            {/* Dynamic luxury circular spinning indicator around the cake circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2.5 pointer-events-none select-none z-10">
              <span className="bg-[#B0863C] text-white font-mono text-[9px] tracking-[0.2em] font-bold px-3 py-1.5 rounded-full uppercase shadow-lg flex items-center gap-1.5 animate-pulse">
                <Sparkles size={10} />
                CAKE TOP-VIEW
              </span>
              <p className="text-[10px] font-medium text-[#2C1A12] tracking-wide bg-white/40 backdrop-blur-sm px-2 py-0.5 rounded">
                {language === 'ko' ? '스크롤하여 깊이 줌인' : 'Scroll to Plunge Deep'}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Indicator */}
        <div ref={bottomBarRef} className="absolute bottom-6 left-6 right-6 sm:left-12 sm:right-12 flex items-center justify-between border-t border-[#EFE8DC] pt-4 text-[11px] text-[#4E3C30] font-light transition-all duration-300">
          <span>Scroll Down to Zoom Into the Secret Dessert Scene</span>
          <div className="flex items-center gap-1 animate-bounce">
            <span className="font-mono text-[9px] tracking-widest font-semibold uppercase">SCROLL</span>
            <ChevronDown size={12} />
          </div>
        </div>
      </div>

      {/* Foreground Layer 2: Revealed Full-Screen Cinematic Slogan (Dark Theme, Crisp White Text) */}
      <div 
        ref={textRevealRef}
        className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6 pointer-events-none select-none opacity-0"
      >
        <div className="max-w-3xl space-y-5">
          <span className="text-[#B0863C] text-[10px] sm:text-[11px] font-mono tracking-[0.5em] block font-extrabold uppercase">
            THE SENSE OF ARTISAN MASTERY
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-light leading-tight text-white tracking-tight keep-all break-keep">
            {language === 'ko' ? (
              <>
                완벽한 텍스처를 향한 <br className="sm:hidden" />
                <span className="font-serif italic font-medium text-[#FAF4EA]">파티시에의 무한한 집념</span>
              </>
            ) : (
              <>
                An Infinite Obsession for <br className="sm:hidden" />
                <span className="font-serif italic font-medium text-[#FAF4EA]">the Absolute Perfect Texture</span>
              </>
            )}
          </h2>
          <div className="w-16 h-[1px] bg-[#B0863C] mx-auto my-4" />
          <p className="text-xs sm:text-sm text-white/85 max-w-lg mx-auto font-light leading-relaxed tracking-wide keep-all break-keep">
            {language === 'ko' ? (
              "아틀리에 크렘이 수년간 정교화한 오븐 기압 공식과 크림 마스킹 기술을 통해, 손가락 끝의 감각이 과학적 마스터피스가 되는 순간을 선사합니다."
            ) : (
              "Discover the exact oven pressure formula and cream masking techniques perfected over years, transforming raw intuition into master-level French pastries."
            )}
          </p>
          <div className="pt-6">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 border border-white/20 rounded-full bg-white/5 backdrop-blur-sm text-[10px] font-semibold text-white uppercase tracking-[0.2em]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B0863C] animate-ping" />
              Live VOD Streaming Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
