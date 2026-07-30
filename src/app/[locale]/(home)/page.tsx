import HomeScreen from '@/components/HomeScreen';
import { getCatalog } from '@/lib/catalog';
import { getLocale } from 'next-intl/server';

// DC-96 (PRD-F-20) · 홈 = 브랜드 게이트웨이. 전체 클래스 목록은 /classes로 분리됐다.
// course_catalog는 세션 무관 공개 데이터지만, 운영자 게시 즉시 반영을 위해 동적 렌더.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const locale = await getLocale();
  const classes = await getCatalog(locale);
  return <HomeScreen classes={classes} />;
}
