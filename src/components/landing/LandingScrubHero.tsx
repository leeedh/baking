'use client';

import { useScrollScrub } from '@/hooks/useScrollScrub';
import { Link, useRouter } from '@/i18n/navigation';
import { beatOpacity, clamp } from '@/lib/scrub/progress';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 스크럽 자산. 자체 촬영본으로 교체할 때 이 네 값만 바꾸면 된다.
 *
 * 원본은 `assets/source/slyfox_dessert_final.mp4`에 있다 — 런타임에 쓰지 않으므로
 * `public/` 밖에 둔다(공개 URL로 서빙되면 타사 광고 영상을 그대로 호스팅하는 셈이다).
 * 원본은 10.125초에 키프레임이 단 2개라 임의 지점 seek에 최대 120ms가 걸렸다.
 * 아래 파일은 0~7.2초를 잘라 전 프레임 키프레임(all-intra)으로 재인코딩한 것이다
 * (실측 seek 2~8ms).
 *
 * **7.2초를 넘기지 말 것** — 원본은 케이크가 타사 브랜드(SLYFOX) 아이스크림 통으로
 * 모핑하며 끝난다. 로고가 또렷해지는 건 8.6초지만 통 테두리는 이미 7.5초에 잡히고,
 * 7.3초까지는 턴테이블이 깨끗하다(프레임 확인). 7.2초는 그 안쪽 여유다.
 */
const SCRUB_SRC = '/landing/cake-scrub.mp4';
const SCRUB_POSTER = '/landing/cake-poster.webp';
const SCRUB_DURATION = 7.2;
const SCRUB_FPS = 24;

/**
 * 카피 한 덩어리가 온전히 보이는 진행률 구간. 사이는 교차 페이드로 메운다.
 * 영상 구간과 맞춰 뒀다 — 01 진입(민무늬 케이크) · 02 피핑 · 03 딸기 · 04 완성.
 */
const BEATS = [
  { start: 0, end: 0.18, fadeIn: false },
  { start: 0.24, end: 0.44 },
  { start: 0.5, end: 0.68 },
  { start: 0.74, end: 1, fadeOut: false },
] as const;
const FINALE = BEATS.length - 1;
const FADE = 0.06;

type Beat = { title: string; emphasis: string; body: string };
type Stat = { value: string; label: string };

export default function LandingScrubHero() {
  const t = useTranslations('landing.scrub');
  const router = useRouter();
  const [query, setQuery] = useState('');

  /**
   * 프레임마다 바뀌는 값은 **상태로 두지 않는다.** 진행률을 state로 올렸더니
   * 프레임당 전체 트리 리렌더가 걸려 rAF가 초당 1프레임까지 떨어졌다(실측).
   * 아래 ref들에 직접 스타일을 쓴다. 상태는 한 번만 뒤집히는 두 개뿐이다.
   */
  const beatRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hintRef = useRef<HTMLParagraphElement | null>(null);
  const meterRef = useRef<HTMLDivElement | null>(null);

  // 보이지 않는 CTA로 Tab 포커스가 빨려 들어가지 않게 하는 스위치. 경계에서 한 번만 바뀐다.
  const [finaleReady, setFinaleReady] = useState(false);

  const onFrame = useCallback((progress: number) => {
    for (let i = 0; i < BEATS.length; i++) {
      const el = beatRefs.current[i];
      if (!el) continue;
      const beat = BEATS[i];
      const opacity = beatOpacity(progress, beat.start, beat.end, FADE, {
        fadeIn: 'fadeIn' in beat ? beat.fadeIn : true,
        fadeOut: 'fadeOut' in beat ? beat.fadeOut : true,
      });
      el.style.opacity = String(opacity);
      // 투명해진 카피가 클릭·드래그를 가로채지 않게 한다.
      el.style.pointerEvents = opacity < 0.05 ? 'none' : '';
    }

    if (hintRef.current) {
      hintRef.current.style.opacity = String(clamp(1 - progress / 0.08));
    }
    if (meterRef.current) {
      meterRef.current.style.transform = `scaleY(${progress})`;
    }

    setFinaleReady((prev) => {
      const next = progress >= BEATS[FINALE].start - FADE;
      return prev === next ? prev : next;
    });
  }, []);

  const { trackRef, videoRef, active, reduced } = useScrollScrub({
    duration: SCRUB_DURATION,
    fps: SCRUB_FPS,
    onFrame,
  });

  /**
   * 핀이 붙을 자리를 실측해 CSS 변수로 넘긴다.
   * 사이트 헤더는 `sticky top-0 z-40`(`Header.tsx`)이고 높이가 뷰포트 폭에 따라
   * 61~169px로 출렁인다(실측). 여기에 랜딩 프레임의 여백·테두리까지 더해지므로
   * 고정 오프셋으로는 맞출 수 없다. 보정이 없으면 핀 상단이 헤더에 가리고,
   * 스크롤 0에서 하단 액션 바가 첫 화면 밖으로 접힌다.
   */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const header = document.querySelector('header');

    const sync = () => {
      const headerHeight = header?.getBoundingClientRect().height ?? 0;
      // 문서 기준 트랙 상단 = 스크롤 0에서 프레임이 밀려 있는 양.
      const inset = track.getBoundingClientRect().top + window.scrollY;
      track.style.setProperty('--landing-pin-top', `${Math.round(headerHeight)}px`);
      track.style.setProperty('--landing-pin-inset', `${Math.round(inset)}px`);
    };

    sync();

    // 리사이즈만 듣고 끝내면 안 된다 — 웹폰트가 늦게 도착하며 헤더가 한 번 더 커지는데
    // (768px에서 내비가 두 줄로 접히며 80px → 169px, 실측) 그때 다시 재지 않으면
    // 첫 화면에서 액션 바가 그만큼 잘린다. ResizeObserver가 그 리플로를 잡는다.
    const observer = new ResizeObserver(sync);
    if (header) observer.observe(header);
    window.addEventListener('resize', sync);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, [trackRef]);

  const beats = t.raw('beats') as Beat[];
  const stats = t.raw('stats') as Stat[];

  const goSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/classes?q=${encodeURIComponent(q)}` : '/classes');
  };

  /**
   * 스크럽이 꺼져 있으면(모션 감소·JS 미실행) 인라인 불투명도를 아무도 쓰지 않아
   * 모든 카피가 그대로 보인다. 진행률에 따라 마운트를 바꾸지 않는 이유이기도 하다 —
   * 스크린리더에는 스크롤 진행률이라는 개념이 없다.
   */
  const setBeatRef = (i: number) => (el: HTMLDivElement | null) => {
    beatRefs.current[i] = el;
  };

  return (
    <section
      ref={trackRef}
      aria-labelledby="landing-scrub-heading"
      className="landing-scrub relative"
      data-active={active || undefined}
    >
      <div className="landing-scrub__pin bg-cream text-brown">
        {reduced ? (
          /* 모션 감소: 스크럽을 포기한 사용자에게 7MB짜리 mp4를 내려보낼 이유가 없다.
             CSS로 숨기기만 하면 브라우저는 그대로 받아 간다 — 요소 자체를 바꾼다. */
          <img
            src={SCRUB_POSTER}
            alt=""
            aria-hidden="true"
            className="landing-scrub__video"
          />
        ) : (
          <video
            ref={videoRef}
            src={SCRUB_SRC}
            poster={SCRUB_POSTER}
            muted
            playsInline
            /* `auto`도 `metadata`도 첫 화면에서 7MB를 통째로 끌어온다 —
               Chromium은 metadata에도 0부터 전체 범위를 range 요청한다(실측).
               `none`이면 훅이 스크럽을 켜면서 부르는 play()까지 한 바이트도 받지 않고,
               모션 감소 사용자는 아예 받지 않는다. 끝내 안 오면 훅이 정적으로 강등한다. */
            preload="none"
            disablePictureInPicture
            aria-hidden="true"
            tabIndex={-1}
            className="landing-scrub__video"
          />
        )}

        {/* 좌우 비네트 — 가운데 케이크는 건드리지 않고 가장자리만 눌러 카피를 띄운다. */}
        <div aria-hidden className="landing-scrub__vignette" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-cream via-cream/55 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-cream via-cream/70 to-transparent"
        />
        {/*
          다음 섹션으로 넘어가는 다크 그라디언트를 여기 깔지 않는다. 시도해 봤지만
          이 구간의 텍스트는 전부 밝은 면 기준(gold-deep·brown)이라, 아래를 어둡게
          덮는 순간 지표 라벨·검색 placeholder·CTA가 통째로 묻혔다. 핀이 풀리면서
          다음 섹션(hero-ink)이 그대로 올라오는 편이 정직하다.
        */}
        <div className="landing-scrub__stage">
          {/*
            상시 액션 레이어 — 스크럽 진행률과 무관하게 항상 살아 있다.
            검색과 1차 CTA를 finale(진행률 0.68 = 화면 두 장 남짓)에 가둬 뒀더니
            첫 화면에서 아무 데도 갈 수 없었고, 키보드로는 아예 도달하지 못했다.
            홈 `MeringueHero`의 #hero-fixed-action-bar와 같은 역할이다.
            **여기에 둔 것을 finale에 복제하지 말 것** — finale가 열리는 순간
            같은 aria-label을 가진 검색 입력이 두 개 노출된다.
          */}
          <div className="landing-scrub__actions flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4 sm:px-12 lg:px-16">
            <form onSubmit={goSearch} className="relative flex-1 sm:max-w-xs">
              <Search
                size={14}
                className="absolute left-0 top-1/2 -translate-y-1/2 text-gold-deep"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                aria-label={t('searchAria')}
                className="w-full border-0 border-b border-gold-deep/40 bg-transparent pl-7 pr-3 py-3 min-h-[44px] text-sm text-brown placeholder:text-brown-medium/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
            </form>
            <Link
              href="/classes"
              className="inline-flex items-center justify-center min-h-[44px] px-7 bg-brown text-cream text-[11px] font-bold tracking-[0.22em] uppercase hover:bg-brown-deep transition-colors cursor-pointer"
            >
              {t('ctaEnter')}
            </Link>
          </div>

          {/* 01 — 진입. h1은 하나뿐이고 처음부터 보인다(LCP 텍스트). */}
          <div
            ref={setBeatRef(0)}
            className="landing-scrub__beat landing-scrub__beat--top"
          >
            <p className="text-[10px] font-bold tracking-[0.38em] uppercase text-gold-deep">
              {t('kicker')}
            </p>
            <h1
              id="landing-scrub-heading"
              className="font-landing mt-4 text-[2.1rem] sm:text-5xl lg:text-[3.4rem] font-medium leading-[1.12] tracking-tight text-brown break-keep"
            >
              <span className="block">{t('title1')}</span>
              <span className="block italic font-normal text-gold-deep">{t('title2')}</span>
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-brown-medium font-light break-keep">
              {t('desc')}
            </p>
          </div>

          {/* 02~03 — 공정 해설. 피핑·마감 구간에 맞춰 교차한다. */}
          {beats.map((beat, i) => (
            <div
              key={beat.title}
              ref={setBeatRef(i + 1)}
              className="landing-scrub__beat landing-scrub__beat--bottom"
            >
              <p className="font-landing text-2xl sm:text-3xl lg:text-4xl leading-[1.2] text-brown break-keep">
                <span className="block">{beat.title}</span>
                <span className="block italic text-gold-deep">{beat.emphasis}</span>
              </p>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-brown-medium font-light break-keep">
                {beat.body}
              </p>
            </div>
          ))}

          {/* 04 — 완성. 지표·검색·CTA로 전환을 받는다. */}
          <div
            ref={setBeatRef(FINALE)}
            className="landing-scrub__beat landing-scrub__beat--finale"
            inert={active && !finaleReady}
          >
            <p className="font-landing text-2xl sm:text-3xl lg:text-4xl leading-[1.2] text-brown break-keep">
              <span>{t('finaleTitle')} </span>
              <span className="italic text-gold-deep">{t('finaleEmphasis')}</span>
            </p>

            <dl className="mt-6 grid grid-cols-3 gap-3 max-w-sm border-y border-gold-deep/30 py-4">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-[9px] tracking-[0.22em] uppercase text-gold-deep">
                    {stat.label}
                  </dt>
                  <dd className="font-landing mt-1 text-xl sm:text-2xl text-brown">{stat.value}</dd>
                </div>
              ))}
            </dl>

            {/* 검색과 `ctaEnter`는 상시 액션 레이어로 올라갔다. 여기 남은 보조 CTA 하나만
                inert가 가리므로, 투명한 동안 Tab 포커스가 빨려 들어가지 않는다. */}
            <div className="mt-6">
              <Link
                href="/about"
                className="inline-flex items-center justify-center min-h-[44px] px-7 border border-gold-deep/60 text-gold-deep text-[11px] font-semibold tracking-[0.18em] uppercase hover:border-gold-deep hover:bg-gold-deep/10 transition-colors cursor-pointer"
              >
                {t('ctaChef')}
              </Link>
            </div>
          </div>
        </div>

        {/* 진행 인디케이터 — 스크롤바를 시각적으로 되풀이할 뿐이라 장식으로 둔다. */}
        {active && (
          <div
            aria-hidden
            className="pointer-events-none absolute right-4 sm:right-6 top-1/2 hidden h-32 w-px -translate-y-1/2 bg-brown/15 sm:block"
          >
            <div ref={meterRef} className="h-full w-px origin-top scale-y-0 bg-gold-deep" />
          </div>
        )}

        {/* 스크롤 힌트 — 시작 부근에서만. */}
        {active && (
          <p
            ref={hintRef}
            aria-hidden
            className="landing-scrub__hint pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.3em] uppercase text-brown-medium"
          >
            {t('scrollHint')}
          </p>
        )}
      </div>
    </section>
  );
}
