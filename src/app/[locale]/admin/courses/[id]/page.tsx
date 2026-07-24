import LessonManager from '@/components/LessonManager';
import { getCourseLessons } from '@/lib/admin';
import { getProfile } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';

// 세션 쿠키 role 가드 → 요청마다 동적 렌더.
export const dynamic = 'force-dynamic';

export default async function AdminCourseLessonsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const profile = await getProfile();
  if (!profile) redirect(`/${locale}/login`);
  if (profile.role !== 'admin') redirect(`/${locale}`);

  const data = await getCourseLessons(id);
  if (!data) notFound();

  return (
    <LessonManager
      courseId={data.courseId}
      courseTitle={data.courseTitle}
      initialLessons={data.lessons}
    />
  );
}
