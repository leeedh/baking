import { problem } from '@/lib/api/problem';
import { playbackTokenTtlSec, signPlaybackToken } from '@/lib/mux/client';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// TS-API-12 · 보안 재생 토큰: 수강권(또는 미리보기) 확인 후 Mux 단기 서명 JWT 발급.
// 이중 방어(TS-SEC-02/03): (1) lessons_select_guarded RLS로 행 노출 자체를 게이팅,
// (2) 비미리보기 차시는 has_course_access()로 서버 재확인.
const BodySchema = z.object({
  lessonId: z.guid(), // Postgres uuid 정합 (z.uuid()는 버전 비트 강제 — payments 라우트 참조)
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return problem(400, 'invalid-request', 'Invalid request body', parsed.error.message);
  }
  const { lessonId } = parsed.data;

  // RLS(lessons_select_guarded): 미리보기 OR 활성 수강권 OR 관리자만 행이 조회된다.
  // 비로그인도 미리보기 차시는 조회·재생 가능(학습 페이지의 무료 미리보기 정책과 일치).
  // 조회 실패 = 접근 불가 → 존재 여부를 숨긴 채 403.
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, course_id, mux_playback_id, is_preview, duration_sec')
    .eq('id', lessonId)
    .maybeSingle();
  if (!lesson) {
    return problem(403, 'no-access', 'No access to lesson', '이 차시를 재생할 권한이 없습니다.');
  }

  // 방어적 재확인: 미리보기가 아니면 로그인 + 활성 수강권 필수 (RLS와 이중 방어).
  if (!lesson.is_preview) {
    if (!user) {
      return problem(401, 'unauthorized', 'Login required', '로그인이 필요합니다.');
    }
    const { data: hasAccess } = await supabase.rpc('has_course_access', {
      p_course_id: lesson.course_id,
    });
    if (!hasAccess) {
      return problem(403, 'no-access', 'No access to lesson', '이 차시를 재생할 권한이 없습니다.');
    }
  }

  if (!lesson.mux_playback_id) {
    return problem(409, 'no-video', 'Video not ready', '아직 영상이 준비되지 않은 차시입니다.');
  }

  // 차시 길이에 비례한 만료 — 한 번 발급으로 전체 재생을 끊김 없이 커버(재발급 불필요).
  const ttlSec = playbackTokenTtlSec(lesson.duration_sec);
  let token: string;
  try {
    token = await signPlaybackToken(lesson.mux_playback_id, `${ttlSec}s`);
  } catch (e) {
    // Mux 미프로비저닝(선결) 상태 — 코드는 배포되되 키 확보 전까지 503.
    return problem(503, 'mux-unconfigured', 'Playback unavailable', (e as Error).message);
  }

  return NextResponse.json({
    token,
    playbackId: lesson.mux_playback_id,
    expiresAt: Date.now() + ttlSec * 1000,
  });
}
