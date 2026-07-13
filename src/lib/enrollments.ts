import 'server-only';

import { createClient } from '@/lib/supabase/server';

/** 현재 사용자의 활성 수강권 코스 slug 목록 (RLS: 본인 것만 조회됨). */
export async function getEnrolledCourseSlugs(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('enrollments')
    .select('status, courses(slug)')
    .eq('user_id', user.id)
    .eq('status', 'active');

  return (data ?? [])
    .map((e) => (e.courses as { slug: string } | null)?.slug)
    .filter((s): s is string => !!s);
}

/** slug 기준 활성 수강권 보유 여부. */
export async function hasEnrollmentBySlug(slug: string): Promise<boolean> {
  return (await getEnrolledCourseSlugs()).includes(slug);
}
