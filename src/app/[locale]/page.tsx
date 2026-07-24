import CatalogScreen from '@/components/CatalogScreen';
import { getCatalog } from '@/lib/catalog';
import { getLocale } from 'next-intl/server';

// course_catalog는 세션 무관 공개 데이터지만, 운영자 게시 즉시 반영을 위해 동적 렌더.
export const dynamic = 'force-dynamic';

export default async function CatalogPage() {
  const locale = await getLocale();
  const classes = await getCatalog(locale);
  return <CatalogScreen classes={classes} />;
}
