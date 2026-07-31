import 'server-only';

import { pickLocale } from '@/lib/i18n-json';
import { createAdminClient } from '@/lib/supabase/admin';
import { unwrap } from '@/lib/supabase/query';

/** 학습 페이지에 내려보내는 자료 메타 — storage_path는 절대 노출하지 않는다. */
export interface MaterialItem {
  id: string;
  title: string;
  sizeBytes: number | null;
}

/**
 * 코스 전 차시의 자료를 차시별로 묶어 반환한다(lessonId → 자료 목록).
 *
 * `lessons.ts`가 `mux_playback_id`를 boolean으로만 노출하는 것과 같은 원칙으로,
 * `storage_path`는 반환 객체에 담지 않는다. 실제 파일 접근은 다운로드 API가
 * RLS(materials_select_enrolled) + has_course_access()로 매번 재검증한다.
 *
 * 호출자(getLearnPageData)가 수강권 보유 여부로 노출을 한 번 더 게이팅한다.
 */
export async function getMaterialsByLesson(
  courseId: string,
  locale: string,
): Promise<Record<string, MaterialItem[]>> {
  const admin = createAdminClient();
  const data = unwrap(
    await admin
      .from('materials')
      .select('id, lesson_id, title, size_bytes, lessons!inner(course_id)')
      .eq('lessons.course_id', courseId)
      .order('created_at', { ascending: true }),
    '수업 자료',
  );

  const byLesson: Record<string, MaterialItem[]> = {};
  for (const row of (data ?? []) as unknown as Array<{
    id: string;
    lesson_id: string;
    title: unknown;
    size_bytes: number | null;
  }>) {
    const list = byLesson[row.lesson_id] ?? [];
    list.push({ id: row.id, title: pickLocale(row.title, locale), sizeBytes: row.size_bytes });
    byLesson[row.lesson_id] = list;
  }
  return byLesson;
}
