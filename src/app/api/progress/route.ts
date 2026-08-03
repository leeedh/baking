import { assertSameOrigin } from '@/lib/api/origin';
import { problem, problemWithCause } from '@/lib/api/problem';
import { clampWatchedSec, deriveCompleted } from '@/lib/progress/policy';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// TS-API-04 · 진도 저장: 차시별 시청 위치를 upsert. RLS(progress_all_own)가 본인 소유만
// 쓰기 허용하므로 service_role 불필요 — anon+쿠키 클라이언트로 auth.uid() 기준 기록.
//
// 본문 값은 신뢰하지 않는다(코드리뷰 M-6): watchedSec은 차시 길이로 clamp하고 completed는
// 서버가 도출한다 — 판정은 lib/progress/policy.ts(단위 테스트 대상).
const BodySchema = z.object({
  lessonId: z.guid(),
  watchedSec: z.number().int().nonnegative(),
  completed: z.boolean().optional(),
});

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

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'invalid-request', 'Invalid request body', '요청 형식이 올바르지 않습니다.');
  }
  const { lessonId, watchedSec, completed } = parsed.data;

  // 접근권 확인 (1/2): RLS(lessons_select_guarded)로 미리보기 OR 활성 수강권 차시만 조회된다.
  // duration_sec는 아래 진도 판정에, course_id·is_preview는 이중 방어에 쓴다(추가 왕복 없음).
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, course_id, is_preview, duration_sec')
    .eq('id', lessonId)
    .maybeSingle();
  if (!lesson) {
    return problem(
      403,
      'no-access',
      'No access to lesson',
      '이 차시의 진도를 저장할 권한이 없습니다.',
    );
  }

  // 접근권 확인 (2/2, 코드리뷰 L-4): 재생 토큰 라우트(TS-API-12)와 같은 이중 방어.
  // RLS 단독에 기대지 않고 비미리보기 차시는 has_course_access()로 서버 재확인한다.
  // 비로그인은 위에서 이미 401로 걸렀으므로 토큰 라우트와 달리 로그인 분기는 없다.
  if (!lesson.is_preview) {
    const { data: hasAccess } = await supabase.rpc('has_course_access', {
      p_course_id: lesson.course_id,
    });
    if (!hasAccess) {
      return problem(
        403,
        'no-access',
        'No access to lesson',
        '이 차시의 진도를 저장할 권한이 없습니다.',
      );
    }
  }

  // 되감기·재시청으로 진도가 뒷걸음치지 않도록 기존값과 비교해 최대치 유지.
  const { data: existing } = await supabase
    .from('progress')
    .select('watched_sec, completed')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  // 클라이언트 값을 차시 길이로 되짚는다 — 부풀린 watchedSec으로 완강을 살 수 없다(M-6).
  const nextWatchedSec = Math.max(
    clampWatchedSec(watchedSec, lesson.duration_sec),
    existing?.watched_sec ?? 0,
  );
  const nextCompleted = deriveCompleted({
    watchedSec: nextWatchedSec,
    durationSec: lesson.duration_sec,
    clientCompleted: completed,
    previousCompleted: existing?.completed ?? false,
  });

  const { error } = await supabase.from('progress').upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      watched_sec: nextWatchedSec,
      completed: nextCompleted,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,lesson_id' },
  );
  if (error) {
    // RLS 위반(타 유저 lesson 등)·FK 오류 등.
    return problemWithCause(
      403,
      'progress-denied',
      'Progress not saved',
      '진도를 저장하지 못했습니다.',
      error,
    );
  }

  return NextResponse.json({ ok: true, watchedSec: nextWatchedSec, completed: nextCompleted });
}
