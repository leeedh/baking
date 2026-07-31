import { assertSameOrigin } from '@/lib/api/origin';
import { problem } from '@/lib/api/problem';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// DC-47 · 차시 등록. order_index는 서버가 (해당 course 최대값 + 1)로 배정한다.
const BodySchema = z.object({
  courseId: z.guid(),
  titleKo: z.string().trim().min(1).max(200),
  titleEn: z.string().trim().max(200).optional().default(''),
  chapterIndex: z.number().int().min(1).max(99).optional().default(1),
  chapterTitleKo: z.string().trim().max(200).optional().default(''),
  chapterTitleEn: z.string().trim().max(200).optional().default(''),
  durationSec: z.number().int().min(0).nullable().optional(),
  isPreview: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  // /api는 미들웨어 밖이라 Route Handler가 스스로 막아야 한다(TS-SEC CSRF).
  const crossOrigin = assertSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'invalid-request', 'Invalid request body', parsed.error.message);
  }
  const b = parsed.data;
  const admin = createAdminClient();

  // 대상 course 존재 확인.
  const { data: course } = await admin
    .from('courses')
    .select('id')
    .eq('id', b.courseId)
    .maybeSingle();
  if (!course) {
    return problem(404, 'course-not-found', 'Course not found', '클래스를 찾을 수 없습니다.');
  }

  // 다음 order_index = 현재 최대 + 1 (없으면 1).
  const { data: last } = await admin
    .from('lessons')
    .select('order_index')
    .eq('course_id', b.courseId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (last?.order_index ?? 0) + 1;

  const { data: lesson, error } = await admin
    .from('lessons')
    .insert({
      course_id: b.courseId,
      title: { ko: b.titleKo, en: b.titleEn || b.titleKo },
      chapter_index: b.chapterIndex,
      chapter_title: { ko: b.chapterTitleKo, en: b.chapterTitleEn || b.chapterTitleKo },
      order_index: nextOrder,
      duration_sec: b.durationSec ?? null,
      is_preview: b.isPreview,
    })
    .select('id')
    .single();
  if (error || !lesson) {
    return problem(500, 'lesson-create-failed', 'Lesson creation failed', error?.message);
  }

  return NextResponse.json({ id: lesson.id, orderIndex: nextOrder }, { status: 201 });
}
