import MyClassesScreen from '@/components/MyClassesScreen';
import { getEnrolledCourses } from '@/lib/catalog';
import { getUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// 세션 쿠키를 읽는 인증 가드이므로 요청마다 동적 렌더(정적 프리렌더 금지).
export const dynamic = 'force-dynamic';

export default async function MyClassesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getUser();
  if (!user) redirect(`/${locale}/login`);
  // enrollments + course_catalog 실데이터 (카드 메타·진도율 모두 DB 단일 소스).
  const courses = await getEnrolledCourses(locale);
  return <MyClassesScreen courses={courses} />;
}
