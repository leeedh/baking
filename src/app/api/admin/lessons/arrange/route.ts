import { assertSameOrigin } from '@/lib/api/origin';
import { problem, problemWithCause } from '@/lib/api/problem';
import { requireAdmin } from '@/lib/auth/require-admin';
import { CATALOG_TAG } from '@/lib/cache-tags';
import { pickAutoPreviewLessonId } from '@/lib/lessons/preview';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// 커리큘럼 배치 저장 — 드래그앤드롭 한 번에 "순서"와 "챕터 소속"이 동시에 바뀌므로
// 두 라우트로 나누면 중간 상태(순서만 반영된 화면)가 보인다. 한 번에 확정한다.
//
// chapter_index 0은 "미분류 보관함" — 영상만 올려두고 아직 챕터에 배치하지 않은 차시다.
// 이 약속은 DB가 강제하지 않으므로 학생 화면(커리큘럼)과 게시 경고가 함께 지켜야 한다.
const BodySchema = z.object({
  courseId: z.guid(),
  chapters: z
    .array(
      z.object({
        index: z.number().int().min(0).max(99),
        titleKo: z.string().trim().max(200).optional().default(''),
        titleEn: z.string().trim().max(200).optional().default(''),
        lessonIds: z.array(z.guid()),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  // /api는 미들웨어 밖이라 Route Handler가 스스로 막아야 한다(TS-SEC CSRF).
  const crossOrigin = assertSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'invalid-request', 'Invalid request body', '요청 형식이 올바르지 않습니다.');
  }
  const { courseId, chapters } = parsed.data;

  // 챕터 순서대로 평탄화한 것이 곧 커리큘럼의 재생 순서다.
  const orderedIds = chapters.flatMap((c) => c.lessonIds);
  if (orderedIds.length === 0) {
    return problem(400, 'invalid-request', 'No lessons', '배치할 차시가 없습니다.');
  }
  if (new Set(orderedIds).size !== orderedIds.length) {
    return problem(400, 'invalid-request', 'Duplicate lessons', '차시가 중복 배치되었습니다.');
  }

  const admin = createAdminClient();

  // 넘어온 id 집합이 이 클래스의 차시 전체와 정확히 일치해야 한다. 일부만 오면
  // reorder_lessons가 나머지를 어떻게 다룰지 정의되지 않아 순서가 조용히 깨진다.
  const { data: existing, error: readError } = await admin
    .from('lessons')
    .select('id, is_preview')
    .eq('course_id', courseId);
  if (readError) {
    return problemWithCause(
      500,
      'lesson-read-failed',
      'Lesson read failed',
      '커리큘럼을 불러오지 못했습니다.',
      readError,
    );
  }
  const known = new Set((existing ?? []).map((l) => l.id));
  if (known.size !== orderedIds.length || orderedIds.some((id) => !known.has(id))) {
    return problem(
      400,
      'curriculum-stale',
      'Curriculum mismatch',
      '커리큘럼이 변경되었습니다. 새로고침 후 다시 시도해 주세요.',
    );
  }

  // 1) 순서 — reorder_lessons는 unique(course_id, order_index) 충돌 없이 1..N을 원자적으로
  //    재배치한다(음수 임시 이동 후 재부여). 내부에서 is_admin()으로 자체 방어하므로
  //    service_role이 아니라 운영자 세션 쿠키 클라이언트로 불러야 한다(reorder 라우트와 동일).
  const supabase = await createClient();
  const { error: orderError } = await supabase.rpc('reorder_lessons', {
    p_course_id: courseId,
    p_ids: orderedIds,
  });
  if (orderError) {
    return problemWithCause(
      500,
      'reorder-failed',
      'Reorder failed',
      '차시 순서를 변경하지 못했습니다.',
      orderError,
    );
  }

  // 2) 챕터 소속 — 챕터 수는 많아야 수십 개라 챕터 단위 일괄 update로 충분하다.
  const now = new Date().toISOString();
  for (const chapter of chapters) {
    if (chapter.lessonIds.length === 0) continue;
    const { error } = await admin
      .from('lessons')
      .update({
        chapter_index: chapter.index,
        chapter_title: { ko: chapter.titleKo, en: chapter.titleEn || chapter.titleKo },
        updated_at: now,
      })
      .in('id', chapter.lessonIds);
    if (error) {
      // 순서는 이미 반영됐다 — 부분 실패를 감추지 않고 알린다(운영자가 새로고침해 확인).
      return problemWithCause(
        500,
        'chapter-update-failed',
        'Chapter update failed',
        '챕터 배치를 저장하지 못했습니다. 새로고침 후 다시 시도해 주세요.',
        error,
      );
    }
  }

  // 3) 미리보기 — 상세 화면이 "1차시 무료 미리보기"를 약속하는데 업로드로 만든 차시는
  //    기본이 잠금이라, 손대지 않으면 아무도 못 보는 클래스가 팔린다. 배치가 확정된 지금이
  //    "커리큘럼의 첫 차시"가 정해지는 유일한 지점이다(운영자의 선택은 덮지 않는다 —
  //    판정은 lib/lessons/preview.ts).
  const arrangedIds = chapters.filter((c) => c.index !== 0).flatMap((c) => c.lessonIds);
  const currentPreviewIds = (existing ?? []).filter((l) => l.is_preview).map((l) => l.id);
  const autoPreviewId = pickAutoPreviewLessonId(arrangedIds, currentPreviewIds);
  if (autoPreviewId) {
    const { error } = await admin
      .from('lessons')
      .update({ is_preview: true, updated_at: now })
      .eq('id', autoPreviewId);
    if (error) {
      return problemWithCause(
        500,
        'preview-update-failed',
        'Preview update failed',
        '첫 차시를 미리보기로 지정하지 못했습니다.',
        error,
      );
    }
  }

  // DC-51 · 차시 순서·챕터가 상세 커리큘럼 표시 그 자체다.
  revalidateTag(CATALOG_TAG);

  return NextResponse.json({ ok: true });
}
