import ClassesScreen from '@/components/ClassesScreen';
import { getCatalog } from '@/lib/catalog';
import { setRequestLocale } from 'next-intl/server';

// DC-96 (PRD-F-20) · 온라인 클래스 목록. 홈 히어로 검색이 `?q=`로 넘어온다.
// DC-51 · searchParams를 읽는 한 이 페이지는 정적화되지 않는다(값이 무한하므로 당연하다).
// 대신 getCatalog가 Data Cache에 얹혀 있어 렌더는 동적이어도 DB 왕복은 없다.
export default async function ClassesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ locale }, { q }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const classes = await getCatalog(locale);
  return <ClassesScreen classes={classes} initialSearchQuery={q ?? ''} />;
}
