import 'server-only';

import { pickLocale } from '@/lib/i18n-json';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { ClassItem, CourseDetail, DetailChapter, ReviewItem } from '@/types';

// 단일 브랜드(1인 파티시에) — courses에 강사명 컬럼이 없어 상수로 표기. 직함만 i18n(instructor_title).
const BRAND_INSTRUCTOR = '민소희 (Sohee Min)';

// 아바타 미설정 후기용 중립 플레이스홀더(외부 요청 없이 인라인).
const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><rect width='40' height='40' fill='%23EFE8DC'/><circle cx='20' cy='16' r='7' fill='%23B0863C'/><rect x='8' y='27' width='24' height='14' rx='7' fill='%23B0863C'/></svg>";

const CATALOG_COLUMNS =
  'id, slug, title, description, thumbnail_url, price_krw, list_price_krw, category, level, tags, instructor_title, rating, review_count, students_count, duration_sec, lesson_count';

type CatalogRow = {
  id: string | null;
  slug: string | null;
  title: unknown;
  description: unknown;
  thumbnail_url: string | null;
  price_krw: number | null;
  list_price_krw: number | null;
  category: string | null;
  level: string | null;
  tags: string[] | null;
  instructor_title: unknown;
  rating: number | null;
  review_count: number | null;
  students_count: number | null;
  duration_sec: number | null;
  lesson_count: number | null;
};

/** 총 재생시간·차시 수를 목록/상세 상단 표기 문자열로. */
function formatDuration(durationSec: number, lessonCount: number, locale: string): string {
  const totalMin = Math.round(durationSec / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (locale === 'en') {
    const hm = h > 0 ? `${h}h ${m}m` : `${m}m`;
    return `${lessonCount} lessons (${hm})`;
  }
  const hm = h > 0 ? `${h}시간 ${m}분` : `${m}분`;
  return `총 ${lessonCount}차시 (${hm})`;
}

/** 차시 재생시간을 mm:ss로. */
function formatClock(sec: number | null): string {
  if (!sec || sec <= 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** ISO 타임스탬프를 YYYY.MM.DD로. */
function formatReviewDate(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10).replace(/-/g, '.');
}

/** course_catalog 행을 화면용 ClassItem으로 매핑(id는 라우팅 키인 slug 사용). */
function toClassItem(row: CatalogRow, locale: string): ClassItem {
  return {
    id: row.slug ?? row.id ?? '',
    title: pickLocale(row.title, locale),
    instructor: BRAND_INSTRUCTOR,
    instructorTitle: pickLocale(row.instructor_title, locale),
    description: pickLocale(row.description, locale),
    price: row.price_krw ?? 0,
    originalPrice: row.list_price_krw ?? row.price_krw ?? 0,
    rating: Number(row.rating ?? 0),
    reviewCount: row.review_count ?? 0,
    thumbnail: row.thumbnail_url ?? '',
    category: row.category ?? '',
    level: (row.level as ClassItem['level']) ?? '초급',
    duration: formatDuration(row.duration_sec ?? 0, row.lesson_count ?? 0, locale),
    studentsCount: row.students_count ?? 0,
    tags: row.tags ?? [],
  };
}

/**
 * 카탈로그 목록 — published 클래스만 노출하는 course_catalog 뷰를 anon(쿠키) 클라이언트로
 * 조회한다. 뷰가 WHERE status='published'로 한정하므로 초안은 노출되지 않는다.
 */
export async function getCatalog(locale: string): Promise<ClassItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('course_catalog')
    .select(CATALOG_COLUMNS)
    .order('created_at', { ascending: true });
  return ((data ?? []) as CatalogRow[]).map((row) => toClassItem(row, locale));
}

/** lessons 행을 챕터별 DetailChapter로 그룹핑(민감한 mux_playback_id는 hasVideo로만 노출). */
type DetailLessonRow = {
  id: string;
  title: unknown;
  chapter_index: number;
  chapter_title: unknown;
  order_index: number;
  duration_sec: number | null;
  is_preview: boolean;
  mux_playback_id: string | null;
};

function buildDetailChapters(lessons: DetailLessonRow[], locale: string): DetailChapter[] {
  const byChapter = new Map<number, DetailChapter>();
  for (const l of lessons) {
    let chapter = byChapter.get(l.chapter_index);
    if (!chapter) {
      chapter = {
        id: `ch-${l.chapter_index}`,
        title: pickLocale(l.chapter_title, locale),
        lessons: [],
      };
      byChapter.set(l.chapter_index, chapter);
    }
    chapter.lessons.push({
      id: l.id,
      title: pickLocale(l.title, locale),
      duration: formatClock(l.duration_sec),
      isPreview: l.is_preview,
      hasVideo: !!l.mux_playback_id,
    });
  }
  return [...byChapter.entries()].sort((a, b) => a[0] - b[0]).map(([, ch]) => ch);
}

/**
 * 상세 페이지 데이터 — course_catalog 단건 + 커리큘럼(잠긴 차시 포함) + 후기를 묶어 반환.
 * 존재하지 않거나 미게시(뷰에서 제외)면 null → 호출부에서 notFound() 처리.
 *
 * 커리큘럼은 잠긴 차시까지 노출해야 하므로 service_role(admin)로 RLS를 우회해 전부 읽되,
 * mux_playback_id는 반환하지 않고 hasVideo로만 노출한다(실제 재생 권한은 재생 토큰 API가
 * has_course_access + RLS 이중 방어로 계속 검증). 후기는 공개 RLS(anon)로 조회.
 */
export async function getCourseDetail(slug: string, locale: string): Promise<CourseDetail | null> {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: row } = await supabase
    .from('course_catalog')
    .select(CATALOG_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();
  if (!row) return null;

  const course = toClassItem(row as CatalogRow, locale);
  const courseId = (row as CatalogRow).id;
  if (!courseId) return null;

  const [lessonsRes, reviewsRes] = await Promise.all([
    admin
      .from('lessons')
      .select(
        'id, title, chapter_index, chapter_title, order_index, duration_sec, is_preview, mux_playback_id',
      )
      .eq('course_id', courseId)
      .order('order_index', { ascending: true }),
    supabase
      .from('reviews')
      .select('id, rating, content, created_at, profiles(display_name, avatar_url)')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false }),
  ]);

  const chapters = buildDetailChapters((lessonsRes.data ?? []) as DetailLessonRow[], locale);

  const reviews: ReviewItem[] = (
    (reviewsRes.data ?? []) as unknown as Array<{
      id: string;
      rating: number;
      content: string | null;
      created_at: string | null;
      profiles: { display_name: string | null; avatar_url: string | null } | null;
    }>
  ).map((r) => ({
    id: r.id,
    userName: r.profiles?.display_name ?? '수강생',
    avatar: r.profiles?.avatar_url ?? DEFAULT_AVATAR,
    rating: r.rating,
    date: formatReviewDate(r.created_at),
    content: r.content ?? '',
  }));

  return { course, chapters, reviews };
}
