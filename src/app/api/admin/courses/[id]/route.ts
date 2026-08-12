import { assertSameOrigin } from '@/lib/api/origin';
import { problem, problemWithCause } from '@/lib/api/problem';
import { requireAdmin } from '@/lib/auth/require-admin';
import { CATALOG_TAG } from '@/lib/cache-tags';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { TablesUpdate } from '../../../../../../supabase/database.types';

// DC-46 · 클래스 정보 수정. 최소 한 필드는 있어야 한다.
// 예전엔 가격·공개상태만 고칠 수 있어 제목·설명을 바꿀 화면 자체가 없었다 —
// 통합 편집기(CourseEditor)가 이 라우트 하나로 클래스 정보를 전부 저장한다.
const BodySchema = z
  .object({
    titleKo: z.string().trim().min(1).max(200).optional(),
    titleEn: z.string().trim().max(200).optional(),
    descriptionKo: z.string().trim().max(5000).optional(),
    descriptionEn: z.string().trim().max(5000).optional(),
    instructorTitleKo: z.string().trim().max(200).optional(),
    instructorTitleEn: z.string().trim().max(200).optional(),
    category: z.string().trim().max(80).nullable().optional(),
    level: z.enum(['초급', '중급', '상급']).nullable().optional(),
    priceKrw: z.number().int().min(0).optional(),
    listPriceKrw: z.number().int().min(0).nullable().optional(),
    status: z.enum(['draft', 'published']).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: '수정할 필드가 없습니다.' });

/**
 * jsonb {ko, en} 부분 갱신 — 넘어온 쪽만 바꾸고 나머지는 기존 값을 지킨다.
 * 통째로 덮으면 편집기가 ko만 보낼 때 en 번역이 조용히 사라진다.
 */
function mergeI18n(
  current: unknown,
  ko: string | undefined,
  en: string | undefined,
): Record<string, string> {
  const base = (current && typeof current === 'object' ? current : {}) as Record<string, string>;
  const next = { ...base };
  if (ko !== undefined) next.ko = ko;
  if (en !== undefined) next.en = en;
  return next;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // /api는 미들웨어 밖이라 Route Handler가 스스로 막아야 한다(TS-SEC CSRF).
  const crossOrigin = assertSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!z.guid().safeParse(id).success) {
    return problem(400, 'invalid-request', 'Invalid course id', '잘못된 클래스 ID입니다.');
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'invalid-request', 'Invalid request body', '요청 형식이 올바르지 않습니다.');
  }
  const b = parsed.data;

  const admin = createAdminClient();

  const patch: TablesUpdate<'courses'> = { updated_at: new Date().toISOString() };
  if (b.priceKrw !== undefined) patch.price_krw = b.priceKrw;
  if (b.listPriceKrw !== undefined) patch.list_price_krw = b.listPriceKrw;
  if (b.status !== undefined) patch.status = b.status;
  if (b.category !== undefined) patch.category = b.category;
  if (b.level !== undefined) patch.level = b.level;

  // jsonb 필드는 기존 값을 읽어 병합해야 반대편 로케일이 날아가지 않는다.
  const touchesI18n =
    b.titleKo !== undefined ||
    b.titleEn !== undefined ||
    b.descriptionKo !== undefined ||
    b.descriptionEn !== undefined ||
    b.instructorTitleKo !== undefined ||
    b.instructorTitleEn !== undefined;
  if (touchesI18n) {
    const { data: current } = await admin
      .from('courses')
      .select('title, description, instructor_title')
      .eq('id', id)
      .maybeSingle();
    if (!current) {
      return problem(404, 'course-not-found', 'Course not found', '클래스를 찾을 수 없습니다.');
    }
    if (b.titleKo !== undefined || b.titleEn !== undefined) {
      patch.title = mergeI18n(current.title, b.titleKo, b.titleEn);
    }
    if (b.descriptionKo !== undefined || b.descriptionEn !== undefined) {
      patch.description = mergeI18n(current.description, b.descriptionKo, b.descriptionEn);
    }
    if (b.instructorTitleKo !== undefined || b.instructorTitleEn !== undefined) {
      patch.instructor_title = mergeI18n(
        current.instructor_title,
        b.instructorTitleKo,
        b.instructorTitleEn,
      );
    }
  }

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
      '클래스를 찾을 수 없습니다.',
    );
  }

  // DC-51 · 게시 상태·가격이 카탈로그 캐시의 정확성 그 자체다. 이 호출이 빠지면
  // 최대 1시간 동안 옛 가격이 노출된다.
  revalidateTag(CATALOG_TAG);

  return NextResponse.json(course);
}

/**
 * 클래스 삭제. "새 클래스 등록"이 곧바로 빈 draft를 만들기 때문에, 잘못 만든 draft를
 * 지울 경로가 반드시 함께 있어야 한다.
 *
 * 주문·수강권이 하나라도 있으면 거부한다 — 결제 이력은 지워질 수 없다. DB의 FK도
 * on delete restrict로 같은 규칙을 강제하지만(이중 방어), 여기서 먼저 걸러야
 * 운영자가 읽을 수 있는 한국어 사유를 돌려줄 수 있다.
 * lessons·materials·reviews 행은 FK cascade로 함께 사라지므로, 우리가 직접 치울 것은
 * cascade가 닿지 않는 Storage 객체(자료 PDF·커버 이미지)뿐이다.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const crossOrigin = assertSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!z.guid().safeParse(id).success) {
    return problem(400, 'invalid-request', 'Invalid course id', '잘못된 클래스 ID입니다.');
  }

  const admin = createAdminClient();
  const { data: course } = await admin
    .from('courses')
    .select('id, thumbnail_url')
    .eq('id', id)
    .maybeSingle();
  if (!course) {
    return problem(404, 'course-not-found', 'Course not found', '클래스를 찾을 수 없습니다.');
  }

  const [{ count: orderCount }, { count: enrollmentCount }] = await Promise.all([
    admin.from('orders').select('id', { count: 'exact', head: true }).eq('course_id', id),
    admin.from('enrollments').select('id', { count: 'exact', head: true }).eq('course_id', id),
  ]);
  if ((orderCount ?? 0) > 0 || (enrollmentCount ?? 0) > 0) {
    return problem(
      409,
      'course-in-use',
      'Course has orders',
      '주문·수강 이력이 있는 클래스는 삭제할 수 없습니다. 비공개(초안)로 내려 주세요.',
    );
  }

  // 자료 PDF의 Storage 키는 materials 행에만 있다 — 행이 cascade로 사라지기 전에 모아둔다.
  const { data: materialRows } = await admin
    .from('materials')
    .select('storage_path, lessons!inner(course_id)')
    .eq('lessons.course_id', id);
  const materialPaths = (materialRows ?? [])
    .map((m) => (m as { storage_path: string | null }).storage_path)
    .filter((p): p is string => !!p);

  const { error } = await admin.from('courses').delete().eq('id', id);
  if (error) {
    return problemWithCause(
      500,
      'course-delete-failed',
      'Course deletion failed',
      '클래스를 삭제하지 못했습니다.',
      error,
    );
  }

  // 행 삭제가 확정된 뒤에만 파일을 치운다(실패해도 고아 파일이 남을 뿐 데이터는 일관적).
  if (materialPaths.length > 0) {
    await admin.storage.from('course-materials').remove(materialPaths);
  }
  const cover = ownedThumbnailKey(course.thumbnail_url);
  if (cover) await admin.storage.from('course-images').remove([cover]);

  revalidateTag(CATALOG_TAG);

  return new NextResponse(null, { status: 204 });
}

/** 커버가 우리 버킷의 객체면 그 키를 돌려준다(외부 URL은 건드리지 않는다). */
function ownedThumbnailKey(url: string | null): string | null {
  if (!url) return null;
  const marker = '/storage/v1/object/public/course-images/';
  const at = url.indexOf(marker);
  if (at === -1) return null;
  const key = url.slice(at + marker.length).split('?')[0];
  return key ? decodeURIComponent(key) : null;
}
