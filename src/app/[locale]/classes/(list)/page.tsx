import ClassesScreen from '@/components/ClassesScreen';
import { getCatalog } from '@/lib/catalog';
import { getLocale } from 'next-intl/server';

// DC-96 (PRD-F-20) · 온라인 클래스 목록. 홈 히어로 검색이 `?q=`로 넘어온다.
export const dynamic = 'force-dynamic';

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [locale, { q }] = await Promise.all([getLocale(), searchParams]);
  const classes = await getCatalog(locale);
  return <ClassesScreen classes={classes} initialSearchQuery={q ?? ''} />;
}
