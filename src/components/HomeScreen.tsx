'use client';

import { useRouter } from '@/i18n/navigation';
import { useEffect } from 'react';
import type { ClassItem } from '../types';
import LandingScrubHero from './landing/LandingScrubHero';
import { FLAMINGO_ASSET } from './landing/scrub-assets';
import AnnouncementBar from './sections/AnnouncementBar';
import BestClasses from './sections/BestClasses';
import ChefBanner from './sections/ChefBanner';
import ClassOfferBand from './sections/ClassOfferBand';
import PhilosophyPillars from './sections/PhilosophyPillars';
import StudentArchive from './sections/StudentArchive';

interface HomeScreenProps {
  /** course_catalog 뷰에서 서버가 로드한 게시 클래스 목록. */
  classes: ClassItem[];
}

// DC-96 (PRD-F-20) · 홈 = 브랜드 게이트웨이.
// 히어로 → 베스트 클래스 3개 → 철학(Rows) → 셰프 배너 → 수강생 아카이브(예시) → 대표 클래스 offer.
// Hallmark anatomy "buy": 히어로 다음에 가격이 붙은 상품을 두고, 구매 행동으로 닫는다.
// 뉴스레터는 백엔드가 없어 홈의 마지막 밴드에서 빠지고 푸터 한 줄 안내로 옮겼다.
export default function HomeScreen({ classes }: HomeScreenProps) {
  const router = useRouter();

  // 카드가 router.push 핸들러(클릭 타깃이 여러 개라 Link 래핑 대신)라 자동 프리페치가 안 걸린다.
  // 게이트웨이에서 이어지는 두 축(/classes·/about)과 베스트 3개 상세만 미리 당긴다.
  // 개발 모드에선 프리페치가 on-demand 컴파일을 유발해 오히려 느려지므로 프로덕션에서만 수행한다.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    router.prefetch('/classes');
    router.prefetch('/about');
    router.prefetch('/books');
    for (const cls of [...classes].sort((a, b) => b.rating - a.rating).slice(0, 3)) {
      router.prefetch(`/classes/${cls.id}`);
    }
  }, [router, classes]);

  return (
    <div
      id="home-screen"
      className="bg-ivory min-h-screen text-brown font-sans selection:bg-terracotta/20 selection:text-terracotta"
    >
      <AnnouncementBar />

      {/* 플라밍고 스크롤 스크럽 히어로(구 MeringueHero 원형 줌 대체). 검색은 히어로가
          직접 `/classes?q=`로 보낸다. 서체 변수는 페이지(`(home)/page.tsx`)가 건다. */}
      <LandingScrubHero asset={FLAMINGO_ASSET} />

      <BestClasses classes={classes} />
      <PhilosophyPillars variant="summary" />
      <ChefBanner />
      <StudentArchive />
      <ClassOfferBand classes={classes} />
    </div>
  );
}
