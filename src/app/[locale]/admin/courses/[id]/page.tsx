import CourseEditor from '@/components/admin/CourseEditor';
import { getCourseEditor } from '@/lib/admin';
import { getProfile } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';

// 세션 쿠키 role 가드 → 요청마다 동적 렌더.
export const dynamic = 'force-dynamic';

export default async function AdminCourseEditorPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const profile = await getProfile();
  if (!profile) redirect(`/${locale}/login`);
  if (profile.role !== 'admin') redirect(`/${locale}`);

  const data = await getCourseEditor(id);
  if (!data) notFound();

  return <CourseEditor course={data.course} initialLessons={data.lessons} />;
}
