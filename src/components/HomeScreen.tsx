'use client';

import { useRouter } from '@/i18n/navigation';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import type { ClassItem } from '../types';
import AnnouncementBar from './sections/AnnouncementBar';
import BestClasses from './sections/BestClasses';
import ChefBanner from './sections/ChefBanner';
import NewsletterCTA from './sections/NewsletterCTA';
import PhilosophyPillars from './sections/PhilosophyPillars';
import StudentArchive from './sections/StudentArchive';

const MeringueHero = dynamic(() => import('./MeringueHero'), { ssr: false });

interface HomeScreenProps {
  /** course_catalog 뷰에서 서버가 로드한 게시 클래스 목록. */
  classes: ClassItem[];
}

// DC-96 (PRD-F-20) · 홈 = 브랜드 게이트웨이.
// 히어로 → 철학 요약 3카드 → 베스트 클래스 3개 → 수강생 아카이브 → 셰프 배너 → 뉴스레터.
// 각 섹션은 소개(/about)·온라인 클래스(/classes)로 보내는 진입점 역할만 한다.
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

      <MeringueHero
        onSearch={(query) =>
          router.push(query ? `/classes?q=${encodeURIComponent(query)}` : '/classes')
        }
        onExplore={() => router.push('/classes')}
        onQuiz={() => router.push('/classes#baking-quiz-section')}
      />

      <PhilosophyPillars variant="summary" />
      <BestClasses classes={classes} />
      <StudentArchive />
      <ChefBanner />
      <NewsletterCTA />
    </div>
  );
}
