'use client';

import type { ClassItem } from '@/types';
import './landing.css';
import LandingCarte from './LandingCarte';
import LandingChef from './LandingChef';
import LandingClose from './LandingClose';
import LandingScrubHero from './LandingScrubHero';
import LandingStations from './LandingStations';
import LandingVitrine from './LandingVitrine';

interface LandingScreenProps {
  /** 게시된 클래스. 카르트(메뉴) 섹션이 평점 상위 3개를 고른다. */
  classes: ClassItem[];
}

/**
 * 홈을 대체하지 않는 랜딩 후보.
 * 밝은 아이보리 + 원형 줌 대신, 문이 닫힌 뒤의 진열장(야간 카운터)으로 읽히게 한다.
 */
export default function LandingScreen({ classes }: LandingScreenProps) {
  return (
    <div
      id="landing-candidate"
      className="landing-grain relative isolate bg-hero-ink text-cream selection:bg-gold/30 selection:text-cream -mb-24"
    >
      {/* overflow-hidden이 아니라 overflow-x-clip이다 — `overflow: hidden` 조상은
          자손의 `position: sticky`를 통째로 죽인다(스크럽 히어로의 핀이 안 붙는다).
          가로 넘침만 잘라내는 clip은 sticky를 보존한다. */}
      <div className="relative z-10 m-3 sm:m-5 border border-gold/35 min-h-[calc(100vh-6rem)] overflow-x-clip">
        <LandingScrubHero />
        <LandingStations />
        <LandingCarte classes={classes} />
        <LandingVitrine />
        <LandingChef />
        <LandingClose />
      </div>
    </div>
  );
}
