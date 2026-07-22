import { problem } from '@/lib/api/problem';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// TS-API-04 · 진도 저장: 차시별 시청 위치를 upsert. RLS(progress_all_own)가 본인 소유만
// 쓰기 허용하므로 service_role 불필요 — anon+쿠키 클라이언트로 auth.uid() 기준 기록.
const BodySchema = z.object({
  lessonId: z.guid(),
  watchedSec: z.number().int().nonnegative(),
  completed: z.boolean().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return problem(401, 'unauthorized', 'Login required', '로그인이 필요합니다.');
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'invalid-request', 'Invalid request body', parsed.error.message);
  }
  const { lessonId, watchedSec, completed } = parsed.data;

  // 접근권 확인: RLS(lessons_select_guarded)로 미리보기 OR 활성 수강권 차시만 조회된다.
  // 안 산 차시에 임의 진도를 쓰지 못하도록 재생 토큰 API와 동일한 경계를 적용.
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id')
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

  // 되감기·재시청으로 진도가 뒷걸음치지 않도록 기존값과 비교해 최대치 유지.
  const { data: existing } = await supabase
    .from('progress')
    .select('watched_sec, completed')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  const nextWatchedSec = Math.max(watchedSec, existing?.watched_sec ?? 0);
  // completed는 sticky: 한 번 true면 이후 재생 중 report(completed:false)나 재방문으로
  // 다시 false가 되지 않는다 (완주 취소는 별도 경로가 없으므로 단조 증가).
  const nextCompleted = (existing?.completed ?? false) || (completed ?? false);

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
    return problem(403, 'progress-denied', 'Progress not saved', error.message);
  }

  return NextResponse.json({ ok: true, watchedSec: nextWatchedSec, completed: nextCompleted });
}
