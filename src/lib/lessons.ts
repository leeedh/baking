import 'server-only';

import { pickLocale } from '@/lib/i18n-json';
import { maskEmail } from '@/lib/mask';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/** lessons 행(민감 필드 포함)을 챕터별 PlayerLesson으로 매핑(mux_playback_id는 boolean으로만 노출). */
type LessonRow = {
  id: string;
  title: unknown;
  chapter_index: number;
  chapter_title: unknown;
  order_index: number;
  duration_sec: number | null;
  is_preview: boolean;
  mux_playback_id: string | null;
};

function buildChapters(lessons: LessonRow[], locale: string): PlayerChapter[] {
  const byChapter = new Map<number, PlayerChapter>();
  for (const l of lessons) {
    let chapter = byChapter.get(l.chapter_index);
    if (!chapter) {
      chapter = {
        index: l.chapter_index,
        title: pickLocale(l.chapter_title, locale),
        lessons: [],
      };
      byChapter.set(l.chapter_index, chapter);
    }
    chapter.lessons.push({
      id: l.id,
      title: pickLocale(l.title, locale),
      chapterIndex: l.chapter_index,
      chapterTitle: pickLocale(l.chapter_title, locale),
      orderIndex: l.order_index,
      durationSec: l.duration_sec,
      isPreview: l.is_preview,
      hasVideo: !!l.mux_playback_id,
    });
  }
  return [...byChapter.values()].sort((a, b) => a.index - b.index);
}

/** 플레이어에 전달할 차시(비디오 메타 없음 — playbackId는 토큰 API에서 별도 발급). */
export interface PlayerLesson {
  id: string;
  title: string;
  chapterIndex: number;
  chapterTitle: string;
  orderIndex: number;
  durationSec: number | null;
  isPreview: boolean;
  /** mux_playback_id 존재 여부 — 영상 준비 안 된 차시 구분용. */
  hasVideo: boolean;
}

export interface PlayerChapter {
  index: number;
  title: string;
  lessons: PlayerLesson[];
}

export interface LessonProgress {
  watchedSec: number;
  completed: boolean;
}

export interface LearnPageData {
  /** 활성 수강권 보유 여부 */
  purchased: boolean;
  /** 챕터별 차시(잠긴 차시 포함) */
  chapters: PlayerChapter[];
  /** 차시별 진도 맵 (lessonId → 진도) */
  progress: Record<string, LessonProgress>;
  /** 부분 마스킹된 워터마크 식별자 (비로그인 시 빈 문자열) */
  watermarkLabel: string;
}

/**
 * 학습 페이지가 필요로 하는 데이터를 한 번에 로드 — 사용자·course를 1회만 해석하고
 * 수강권·차시·진도를 병렬 조회해 중복 auth/course 왕복을 없앤다.
 *
 * 커리큘럼(chapters)은 잠긴 차시까지 노출해야 하므로 service_role(admin)로 RLS를 우회해
 * 전부 읽되, 민감한 mux_playback_id는 반환 객체에 포함하지 않고 hasVideo(boolean)로만
 * 노출한다. 실제 재생 권한은 재생 토큰 API(has_course_access + RLS 이중 방어)가 계속
 * 검증하므로 보안 경계는 유지된다. 수강권·진도는 RLS가 걸린 anon+쿠키 클라이언트로 조회.
 */
export async function getLearnPageData(slug: string, locale: string): Promise<LearnPageData> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const watermarkLabel = user?.email ? maskEmail(user.email) : '';

  const { data: course } = await admin.from('courses').select('id').eq('slug', slug).maybeSingle();
  if (!course) {
    return { purchased: false, chapters: [], progress: {}, watermarkLabel };
  }
  const courseId = course.id;

  const [enrollmentRes, lessonsRes, progressRes] = await Promise.all([
    user
      ? supabase
          .from('enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .eq('status', 'active')
          .maybeSingle()
      : Promise.resolve({ data: null }),
    admin
      .from('lessons')
      .select(
        'id, title, chapter_index, chapter_title, order_index, duration_sec, is_preview, mux_playback_id',
      )
      .eq('course_id', courseId)
      .order('order_index', { ascending: true }),
    user
      ? supabase
          .from('progress')
          .select('lesson_id, watched_sec, completed, lessons!inner(course_id)')
          .eq('user_id', user.id)
          .eq('lessons.course_id', courseId)
      : Promise.resolve({ data: [] }),
  ]);

  const chapters = buildChapters((lessonsRes.data ?? []) as LessonRow[], locale);

  const progress: Record<string, LessonProgress> = {};
  for (const row of (progressRes.data ?? []) as unknown as Array<{
    lesson_id?: string;
    watched_sec: number;
    completed: boolean;
  }>) {
    if (row.lesson_id) {
      progress[row.lesson_id] = { watchedSec: row.watched_sec, completed: row.completed };
    }
  }

  return { purchased: !!enrollmentRes.data, chapters, progress, watermarkLabel };
}
