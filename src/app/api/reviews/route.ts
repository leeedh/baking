import { assertSameOrigin } from '@/lib/api/origin';
import { problem } from '@/lib/api/problem';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// DC-60 · 후기 작성/수정/삭제.
//
// 권한 판정은 전부 DB가 한다 — anon+쿠키 클라이언트로 조작하므로
//   · reviews_insert_enrolled  : 수강자만 작성 (has_course_access)
//   · reviews_user_course_uk   : 클래스당 1건
//   · reviews_modify_own/delete_own : 본인 것만 수정/삭제
// 앱 계층에서 같은 조건을 중복 검사하지 않고, 실패 코드만 상태코드로 옮긴다.
const CreateSchema = z.object({
  courseId: z.guid(),
  rating: z.number().int().min(1).max(5),
  content: z.string().trim().max(2000).optional(),
});

const UpdateSchema = z.object({
  courseId: z.guid(),
  rating: z.number().int().min(1).max(5),
  content: z.string().trim().max(2000).optional(),
});

/** 본문 없는 DELETE — 일부 프록시가 DELETE 본문을 버리므로 courseId는 쿼리로 받는다. */
function parseCourseIdParam(request: Request) {
  const courseId = new URL(request.url).searchParams.get('courseId');
  return z.guid().safeParse(courseId);
}

/** 빈 본문은 NULL로 저장한다(''와 NULL이 섞이지 않게). */
function normalizeContent(content: string | undefined) {
  return content && content.length > 0 ? content : null;
}

/** Postgres 오류코드 → RFC 7807 응답. */
function reviewError(code: string | undefined, message: string) {
  if (code === '23505') {
    return problem(409, 'review-exists', 'Review exists', '이미 작성한 후기가 있습니다.');
  }
  if (code === '42501') {
    return problem(403, 'not-enrolled', 'Not enrolled', '수강한 클래스에만 후기를 남길 수 있습니다.');
  }
  // 매핑되지 않은 코드의 원문은 서버 로그로만 보낸다(코드리뷰 L-2).
  console.error(`[review-failed] ${code ?? 'unknown'}: ${message}`);
  return problem(500, 'review-failed', 'Review request failed', '후기를 저장하지 못했습니다.');
}

export async function POST(request: Request) {
  const denied = assertSameOrigin(request);
  if (denied) return denied;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return problem(401, 'unauthorized', 'Login required', '로그인이 필요합니다.');
  }

  const parsed = CreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'invalid-request', 'Invalid request body', '요청 형식이 올바르지 않습니다.');
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      user_id: user.id,
      course_id: parsed.data.courseId,
      rating: parsed.data.rating,
      content: normalizeContent(parsed.data.content),
    })
    .select('id, rating, content')
    .single();
  if (error || !data) {
    return reviewError(error?.code, error?.message ?? '후기를 저장하지 못했습니다.');
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const denied = assertSameOrigin(request);
  if (denied) return denied;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return problem(401, 'unauthorized', 'Login required', '로그인이 필요합니다.');
  }

  const parsed = UpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'invalid-request', 'Invalid request body', '요청 형식이 올바르지 않습니다.');
  }

  const { data, error } = await supabase
    .from('reviews')
    .update({
      rating: parsed.data.rating,
      content: normalizeContent(parsed.data.content),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('course_id', parsed.data.courseId)
    .select('id, rating, content')
    .maybeSingle();
  if (error) {
    return reviewError(error.code, error.message);
  }
  if (!data) {
    return problem(404, 'review-not-found', 'Review not found', '수정할 후기가 없습니다.');
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const denied = assertSameOrigin(request);
  if (denied) return denied;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return problem(401, 'unauthorized', 'Login required', '로그인이 필요합니다.');
  }

  const parsed = parseCourseIdParam(request);
  if (!parsed.success) {
    return problem(400, 'invalid-request', 'Invalid courseId', '잘못된 클래스 ID입니다.');
  }

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('user_id', user.id)
    .eq('course_id', parsed.data);
  if (error) {
    return reviewError(error.code, error.message);
  }

  return NextResponse.json({ ok: true });
}
