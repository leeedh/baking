import { problem } from '@/lib/api/problem';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { TablesUpdate } from '../../../../../../supabase/database.types';

// DC-46 · 클래스 단가·공개상태 수정. 최소 한 필드는 있어야 한다.
const BodySchema = z
  .object({
    priceKrw: z.number().int().min(0).optional(),
    listPriceKrw: z.number().int().min(0).nullable().optional(),
    status: z.enum(['draft', 'published']).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: '수정할 필드가 없습니다.' });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!z.guid().safeParse(id).success) {
    return problem(400, 'invalid-request', 'Invalid course id', '잘못된 클래스 ID입니다.');
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'invalid-request', 'Invalid request body', parsed.error.message);
  }
  const b = parsed.data;

  const patch: TablesUpdate<'courses'> = { updated_at: new Date().toISOString() };
  if (b.priceKrw !== undefined) patch.price_krw = b.priceKrw;
  if (b.listPriceKrw !== undefined) patch.list_price_krw = b.listPriceKrw;
  if (b.status !== undefined) patch.status = b.status;

  const admin = createAdminClient();
  const { data: course, error } = await admin
    .from('courses')
    .update(patch)
    .eq('id', id)
    .select('id, status, price_krw, list_price_krw')
    .single();
  if (error || !course) {
    return problem(
      404,
      'course-not-found',
      'Course not found',
      error?.message ?? '클래스를 찾을 수 없습니다.',
    );
  }

  return NextResponse.json(course);
}
