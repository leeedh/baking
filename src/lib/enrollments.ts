import 'server-only';

import { unwrap } from '@/lib/supabase/query';
import { createClient, getUser } from '@/lib/supabase/server';

/** 현재 사용자의 활성 수강권 코스 slug 목록 (RLS: 본인 것만 조회됨). */
export async function getEnrolledCourseSlugs(): Promise<string[]> {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();

  // 조회 실패를 '수강권 없음'으로 삼키면 구매자가 접근 거부 화면을 본다(코드리뷰 X-2).
  const data = unwrap(
    await supabase
      .from('enrollments')
      .select('status, courses(slug)')
      .eq('user_id', user.id)
      .eq('status', 'active'),
    '수강권',
  );

  return (data ?? [])
    .map((e) => (e.courses as { slug: string } | null)?.slug)
    .filter((s): s is string => !!s);
}

/** slug 기준 활성 수강권 보유 여부. */
export async function hasEnrollmentBySlug(slug: string): Promise<boolean> {
  return (await getEnrolledCourseSlugs()).includes(slug);
}
