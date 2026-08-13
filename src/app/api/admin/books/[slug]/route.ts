import { assertSameOrigin } from '@/lib/api/origin';
import { problem, problemWithCause } from '@/lib/api/problem';
import { requireAdmin } from '@/lib/auth/require-admin';
import { BOOKS } from '@/lib/books-data';
import { BOOKS_TAG } from '@/lib/cache-tags';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * 도서 판매 링크 수정 — 운영자가 도서 상점 화면에서 쿠팡 링크만 갈아 끼운다.
 *
 * 도서는 외부 커머스 큐레이션이라 자체 결제·배송이 없고, 소개 문구·표지·가격은 정적 상수로
 * 관리한다. 그런데 **판매 링크만은 자주 끊긴다**(품절·개편·파트너스 파라미터 변경).
 * 그때마다 배포를 기다리게 하지 않으려고 링크 하나만 DB에 둔다.
 *
 * ⚠️ 파트너스 링크는 트래킹 쿼리스트링까지가 링크다 — 정규화·절단 금지(books-data.ts 경고).
 */
const BodySchema = z.object({
  purchaseUrl: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => /^https:\/\//i.test(v), { message: 'https 주소만 등록할 수 있습니다.' }),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  // /api는 미들웨어 밖이라 Route Handler가 스스로 막아야 한다(TS-SEC CSRF).
  const crossOrigin = assertSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const denied = await requireAdmin();
  if (denied) return denied;

  const { slug } = await params;
  // 정적 큐레이션에 없는 slug로 행이 생기면 아무 화면에도 안 나오는 유령 데이터가 된다.
  const book = BOOKS.find((b) => b.slug === slug);
  if (!book) {
    return problem(404, 'book-not-found', 'Book not found', '해당 도서를 찾을 수 없습니다.');
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(
      400,
      'invalid-request',
      'Invalid request body',
      parsed.error.issues[0]?.message ?? '요청 형식이 올바르지 않습니다.',
    );
  }

  // 링크만 관리하므로 나머지 컬럼은 기본값에 맡긴다. status는 published여야 공개 조회(RLS)에
  // 걸린다 — 여기서 만드는 행은 "운영자가 지정한 링크" 그 자체이므로 항상 공개다.
  const admin = createAdminClient();
  const { error } = await admin.from('books').upsert(
    {
      slug,
      external_purchase_url: parsed.data.purchaseUrl,
      status: 'published',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'slug' },
  );
  if (error) {
    return problemWithCause(
      500,
      'book-update-failed',
      'Book update failed',
      '판매 링크를 저장하지 못했습니다.',
      error,
    );
  }

  // 도서 페이지는 로케일별로 프리렌더된다(빌드 표의 ● — /ko/books · /en/books).
  // 태그 무효화만으로도 데이터 캐시는 비지만, 이미 만들어진 페이지까지 확실히 다시 만들도록
  // 경로 무효화를 함께 건다. 링크가 안 바뀌면 운영자는 고쳤는지조차 알 수 없다.
  revalidateTag(BOOKS_TAG);
  revalidatePath('/[locale]/books', 'page');

  return NextResponse.json({ ok: true });
}
