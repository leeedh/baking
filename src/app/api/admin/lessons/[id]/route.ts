import { problem } from '@/lib/api/problem';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { TablesUpdate } from '../../../../../../supabase/database.types';

// DC-47 · 차시 수정. i18n 텍스트는 ko/en를 함께 받아 jsonb로 병합한다.
const BodySchema = z
  .object({
    titleKo: z.string().trim().min(1).max(200).optional(),
    titleEn: z.string().trim().max(200).optional(),
    chapterIndex: z.number().int().min(1).max(99).optional(),
    chapterTitleKo: z.string().trim().max(200).optional(),
    chapterTitleEn: z.string().trim().max(200).optional(),
    durationSec: z.number().int().min(0).nullable().optional(),
    isPreview: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: '수정할 필드가 없습니다.' });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!z.guid().safeParse(id).success) {
    return problem(400, 'invalid-request', 'Invalid lesson id', '잘못된 차시 ID입니다.');
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'invalid-request', 'Invalid request body', parsed.error.message);
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
      error?.message ?? '차시를 찾을 수 없습니다.',
    );
  }

  return NextResponse.json(lesson);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!z.guid().safeParse(id).success) {
    return problem(400, 'invalid-request', 'Invalid lesson id', '잘못된 차시 ID입니다.');
  }

  const admin = createAdminClient();
  const { error } = await admin.from('lessons').delete().eq('id', id);
  if (error) {
    return problem(500, 'lesson-delete-failed', 'Lesson deletion failed', error.message);
  }

  return NextResponse.json({ ok: true });
}
