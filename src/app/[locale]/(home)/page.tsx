import HomeScreen from '@/components/HomeScreen';
import { getCatalog } from '@/lib/catalog';
import { setRequestLocale } from 'next-intl/server';

// DC-96 (PRD-F-20) · 홈 = 브랜드 게이트웨이. 전체 클래스 목록은 /classes로 분리됐다.
//
// DC-51 · force-dynamic을 걷어냈다. 운영자 게시 즉시 반영은 매 요청 DB 조회가 아니라
// 쓰기 라우트의 revalidateTag(CATALOG_TAG)가 책임진다(getCatalog가 Data Cache에 얹혀 있다).
// 실측 575ms → 40ms.
//
// ⚠️ 이 값이 붙었다고 홈이 빌드 타임에 프리렌더되는 것은 아니다 — 실제로 .next에 HTML이
// 생성되는 페이지는 여전히 login·instructor뿐이다(리포 전반의 선결 과제이지 이 티켓 범위가
// 아니다). 이득의 출처는 정적 셸이 아니라 Data Cache이며, 그것만으로 위 수치가 나온다.
export const revalidate = 3600;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // 정적 렌더 전제 — 없으면 next-intl이 요청 헤더를 읽어 동적으로 떨어진다.
  setRequestLocale(locale);
  const classes = await getCatalog(locale);
  return <HomeScreen classes={classes} />;
}
