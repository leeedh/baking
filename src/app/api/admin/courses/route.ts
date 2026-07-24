import { problem } from '@/lib/api/problem';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// DC-46 · 클래스 등록. 다국어 텍스트는 jsonb {ko, en}. status 기본 draft(게시 전 카탈로그 미노출).
const BodySchema = z.object({
  titleKo: z.string().trim().min(1).max(200),
  titleEn: z.string().trim().max(200).optional().default(''),
  instructorTitleKo: z.string().trim().max(200).optional().default(''),
  instructorTitleEn: z.string().trim().max(200).optional().default(''),
  priceKrw: z.number().int().min(0),
  listPriceKrw: z.number().int().min(0).optional(),
  category: z.string().trim().max(80).optional(),
  level: z.enum(['초급', '중급', '상급']).optional(),
});

/** slug 후보 생성: 소문자·영숫자·하이픈. 비ASCII(한글) 제거 후 비면 course-<rand>. */
function toSlug(titleEn: string, titleKo: string): string {
  const base = (titleEn || titleKo)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || `course-${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'invalid-request', 'Invalid request body', parsed.error.message);
  }
  const b = parsed.data;
  const admin = createAdminClient();

  // slug 유니크 보장: 충돌 시 짧은 접미사 부여(최대 5회).
  let slug = toSlug(b.titleEn, b.titleKo);
  for (let i = 0; i < 5; i++) {
    const { data: clash } = await admin.from('courses').select('id').eq('slug', slug).maybeSingle();
    if (!clash) break;
    slug = `${toSlug(b.titleEn, b.titleKo)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data: course, error } = await admin
    .from('courses')
    .insert({
      slug,
      title: { ko: b.titleKo, en: b.titleEn || b.titleKo },
      instructor_title: { ko: b.instructorTitleKo, en: b.instructorTitleEn || b.instructorTitleKo },
      price_krw: b.priceKrw,
      list_price_krw: b.listPriceKrw ?? null,
      category: b.category ?? null,
      level: b.level ?? null,
      status: 'draft',
    })
    .select('id, slug')
    .single();
  if (error || !course) {
    return problem(500, 'course-create-failed', 'Course creation failed', error?.message);
  }

  return NextResponse.json({ id: course.id, slug: course.slug }, { status: 201 });
}
