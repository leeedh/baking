import 'server-only';

import { pickLocale } from '@/lib/i18n-json';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type {
  AdminClassRow,
  AdminCourseLessons,
  AdminDashboard,
  AdminLesson,
  AdminMaterial,
  AdminOrderRow,
} from '@/types';

// 단일 브랜드(1인 파티시에) — courses에 강사명 컬럼이 없어 상수 표기(catalog.ts와 동일).
const BRAND_INSTRUCTOR = '민소희 (Sohee Min)';

const STATS_COLUMNS =
  'course_id, title, instructor_title, price_krw, list_price_krw, status, sales_count, gross_krw, active_enrollments, avg_completion';

type StatsRow = {
  course_id: string;
  title: unknown;
  instructor_title: unknown;
  price_krw: number | null;
  list_price_krw: number | null;
  status: string | null;
  sales_count: number | null;
  gross_krw: number | null;
  active_enrollments: number | null;
  avg_completion: number | null;
};

function toClassRow(row: StatsRow, locale: string): AdminClassRow {
  return {
    id: row.course_id,
    title: pickLocale(row.title, locale),
    instructor: BRAND_INSTRUCTOR,
    instructorTitle: pickLocale(row.instructor_title, locale),
    price: row.price_krw ?? 0,
    listPrice: row.list_price_krw ?? row.price_krw ?? 0,
    status: row.status === 'published' ? 'published' : 'draft',
    salesCount: row.sales_count ?? 0,
    revenue: row.gross_krw ?? 0,
    activeEnrollments: row.active_enrollments ?? 0,
    // 뷰의 avg_completion은 0~1 비율 → 화면 표기용 백분율(%).
    completionRate: Math.round(Number(row.avg_completion ?? 0) * 1000) / 10,
  };
}

/**
 * 운영자 대시보드 데이터 — admin_course_stats 뷰(security_invoker=on)를 쿠키 클라이언트로
 * 조회한다. RLS상 운영자만 전체 집계를 읽는다(호출부 admin/page.tsx가 role 가드로 이중 보호).
 *
 * 전체 KPI는 클래스별 행에서 재집계한다:
 *   - salesTotal   = Σ gross_krw
 *   - studentsTotal = Σ active_enrollments
 *   - completionRate = 수강권 수 가중 평균(= active 수강권 전체의 진도율 평균과 동일)
 */
export async function getAdminDashboard(locale: string): Promise<AdminDashboard> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('admin_course_stats')
    .select(STATS_COLUMNS)
    .order('gross_krw', { ascending: false });

  const classes = ((data ?? []) as StatsRow[]).map((row) => toClassRow(row, locale));

  const salesTotal = classes.reduce((sum, c) => sum + c.revenue, 0);
  const studentsTotal = classes.reduce((sum, c) => sum + c.activeEnrollments, 0);
  const weightedCompletion = classes.reduce(
    (sum, c) => sum + c.completionRate * c.activeEnrollments,
    0,
  );
  const completionRate =
    studentsTotal > 0 ? Math.round((weightedCompletion / studentsTotal) * 10) / 10 : 0;

  const orders = await getRecentOrders(locale);

  return {
    kpi: { salesTotal, studentsTotal, completionRate },
    classes,
    orders,
  };
}

/**
 * 운영자 주문·환불 목록 — 최근 결제/환불 주문을 service_role로 조회한다(호출부가 role 가드).
 * 환불 대상을 찾기 위한 목록이라 paid/refunded/canceled만 노출한다(pending/failed 제외).
 */
export async function getRecentOrders(locale: string, limit = 50): Promise<AdminOrderRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('orders')
    .select(
      'id, user_id, amount_krw, status, paid_at, canceled_at, created_at, profiles(display_name), courses(title)',
    )
    .in('status', ['paid', 'refunded', 'canceled'])
    .order('created_at', { ascending: false })
    .limit(limit);

  return ((data ?? []) as unknown as OrderJoinRow[]).map((row) => ({
    id: row.id,
    // profiles에 이메일이 없어(auth.users 소재) display_name 우선, 없으면 user_id 앞자리로 식별.
    buyer: row.profiles?.display_name ?? `${row.user_id.slice(0, 8)}…`,
    courseTitle: pickLocale(row.courses?.title, locale),
    amount: row.amount_krw ?? 0,
    status: (row.status ?? 'paid') as AdminOrderRow['status'],
    paidAt: row.paid_at ?? row.created_at ?? null,
    canceledAt: row.canceled_at ?? null,
  }));
}

type OrderJoinRow = {
  id: string;
  user_id: string;
  amount_krw: number | null;
  status: string | null;
  paid_at: string | null;
  canceled_at: string | null;
  created_at: string | null;
  profiles: { display_name: string | null } | null;
  courses: { title: unknown } | null;
};

/** jsonb {ko,en}에서 특정 로케일 문자열만 안전 추출(빈 값 폴백). */
function pickRaw(value: unknown, key: 'ko' | 'en'): string {
  if (value && typeof value === 'object' && key in (value as Record<string, unknown>)) {
    const v = (value as Record<string, unknown>)[key];
    return typeof v === 'string' ? v : '';
  }
  return '';
}

/**
 * 차시 관리 페이지 데이터 — 특정 course의 lessons 전체를 순서대로. service_role로 조회하되
 * 호출부(admin 페이지)가 role 가드로 보호한다. mux_playback_id는 hasVideo로만 노출.
 */
export async function getCourseLessons(courseId: string): Promise<AdminCourseLessons | null> {
  const admin = createAdminClient();

  const { data: course } = await admin
    .from('courses')
    .select('id, title')
    .eq('id', courseId)
    .maybeSingle();
  if (!course) return null;

  const [{ data }, { data: materialRows }] = await Promise.all([
    admin
      .from('lessons')
      .select(
        'id, title, chapter_index, chapter_title, order_index, duration_sec, is_preview, mux_playback_id',
      )
      .eq('course_id', courseId)
      .order('order_index', { ascending: true }),
    admin
      .from('materials')
      .select('id, lesson_id, title, size_bytes, lessons!inner(course_id)')
      .eq('lessons.course_id', courseId)
      .order('created_at', { ascending: true }),
  ]);

  // 자료를 차시별로 묶는다(운영자 화면은 ko 표기 기준).
  const materialsByLesson: Record<string, AdminMaterial[]> = {};
  for (const m of (materialRows ?? []) as unknown as Array<{
    id: string;
    lesson_id: string;
    title: unknown;
    size_bytes: number | null;
  }>) {
    const list = materialsByLesson[m.lesson_id] ?? [];
    list.push({ id: m.id, title: pickLocale(m.title, 'ko'), sizeBytes: m.size_bytes });
    materialsByLesson[m.lesson_id] = list;
  }

  const lessons: AdminLesson[] = (data ?? []).map((l) => ({
    id: l.id,
    titleKo: pickRaw(l.title, 'ko'),
    titleEn: pickRaw(l.title, 'en'),
    chapterIndex: l.chapter_index,
    chapterTitleKo: pickRaw(l.chapter_title, 'ko'),
    chapterTitleEn: pickRaw(l.chapter_title, 'en'),
    orderIndex: l.order_index,
    durationSec: l.duration_sec,
    isPreview: l.is_preview,
    hasVideo: !!l.mux_playback_id,
    materials: materialsByLesson[l.id] ?? [],
  }));

  return {
    courseId: course.id,
    courseTitle: pickLocale(course.title, 'ko'),
    lessons,
  };
}
