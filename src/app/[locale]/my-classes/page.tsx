import MyClassesScreen from '@/components/MyClassesScreen';
import { getEnrolledCourseSlugs } from '@/lib/enrollments';
import { getUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// 세션 쿠키를 읽는 인증 가드이므로 요청마다 동적 렌더(정적 프리렌더 금지).
export const dynamic = 'force-dynamic';

export default async function MyClassesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getUser();
  if (!user) redirect(`/${locale}/login`);
  // 실제 enrollments 기반 소장 목록 (EPIC-D). 카드 메타는 아직 목업 카탈로그 매핑.
  const purchasedClassIds = await getEnrolledCourseSlugs();
  return <MyClassesScreen purchasedClassIds={purchasedClassIds} />;
}
