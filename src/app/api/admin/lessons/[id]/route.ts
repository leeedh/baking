import { assertSameOrigin } from '@/lib/api/origin';
import { problem, problemWithCause } from '@/lib/api/problem';
import { requireAdmin } from '@/lib/auth/require-admin';
import { CATALOG_TAG } from '@/lib/cache-tags';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { TablesUpdate } from '../../../../../../supabase/database.types';

// DC-47 · 차시 수정. i18n 텍스트는 ko/en를 함께 받아 jsonb로 병합한다.
const BodySchema = z
  .object({
    titleKo: z.string().trim().min(1).max(200).optional(),
    titleEn: z.string().trim().max(200).optional(),
    // 0 = 미분류 보관함(arrange 라우트 주석 참조).
    chapterIndex: z.number().int().min(0).max(99).optional(),
    chapterTitleKo: z.string().trim().max(200).optional(),
    chapterTitleEn: z.string().trim().max(200).optional(),
    durationSec: z.number().int().min(0).nullable().optional(),
    isPreview: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: '수정할 필드가 없습니다.' });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // /api는 미들웨어 밖이라 Route Handler가 스스로 막아야 한다(TS-SEC CSRF).
  const crossOrigin = assertSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!z.guid().safeParse(id).success) {
    return problem(400, 'invalid-request', 'Invalid lesson id', '잘못된 차시 ID입니다.');
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'invalid-request', 'Invalid request body', '요청 형식이 올바르지 않습니다.');
  }
  const b = parsed.data;
  const patch: TablesUpdate<'lessons'> = { updated_at: new Date().toISOString() };
  if (b.titleKo !== undefined) patch.title = { ko: b.titleKo, en: b.titleEn || b.titleKo };
  if (b.chapterTitleKo !== undefined)
    patch.chapter_title = { ko: b.chapterTitleKo, en: b.chapterTitleEn || b.chapterTitleKo };
  if (b.chapterIndex !== undefined) patch.chapter_index = b.chapterIndex;
  if (b.durationSec !== undefined) patch.duration_sec = b.durationSec;
  if (b.isPreview !== undefined) patch.is_preview = b.isPreview;

  const admin = createAdminClient();
  const { data: lesson, error } = await admin
    .from('lessons')
    .update(patch)
    .eq('id', id)
    .select('id')
    .single();
  if (error || !lesson) {
    return problem(
      404,
      'lesson-not-found',
      'Lesson not found',
      '차시를 찾을 수 없습니다.',
    );
  }

  // DC-51 · 차시 수정 — 제목·재생시간이 상세 커리큘럼에 반영된다.
  revalidateTag(CATALOG_TAG);
  
  return NextResponse.json(lesson);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // /api는 미들웨어 밖이라 Route Handler가 스스로 막아야 한다(TS-SEC CSRF).
  const crossOrigin = assertSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!z.guid().safeParse(id).success) {
    return problem(400, 'invalid-request', 'Invalid lesson id', '잘못된 차시 ID입니다.');
  }

  const admin = createAdminClient();

  // materials 행은 FK cascade로 사라지지만 Storage 객체는 남는다 — 키를 미리 모아둔다.
  const { data: materialRows } = await admin
    .from('materials')
    .select('storage_path')
    .eq('lesson_id', id);
  const materialPaths = (materialRows ?? [])
    .map((m) => m.storage_path)
    .filter((p): p is string => !!p);

  const { error } = await admin.from('lessons').delete().eq('id', id);
  if (error) {
    return problemWithCause(
      500,
      'lesson-delete-failed',
      'Lesson deletion failed',
      '차시를 삭제하지 못했습니다.',
      error,
    );
  }

  // 행 삭제가 확정된 뒤에만 파일을 치운다(실패해도 고아 파일이 남을 뿐 데이터는 일관적).
  if (materialPaths.length > 0) {
    await admin.storage.from('course-materials').remove(materialPaths);
  }

  // DC-51 · 차시 삭제 — 집계와 커리큘럼이 함께 바뀐다.
  revalidateTag(CATALOG_TAG);
  
  return NextResponse.json({ ok: true });
}
