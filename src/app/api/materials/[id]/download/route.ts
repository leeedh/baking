import { problem } from '@/lib/api/problem';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// DC-59 · 학습 자료 다운로드: 수강권 확인 후 비공개 버킷의 단기 서명 URL을 발급한다.
// 재생 토큰 API(/api/playback/token)와 동일한 이중 방어:
//   (1) materials_select_enrolled RLS로 행 노출 자체를 게이팅
//   (2) has_course_access()로 서버 재확인
// 영상과 달리 미리보기(is_preview) 예외는 두지 않는다 — 자료는 수강권 보유자 전용(PRD-F-09).
const SIGNED_URL_TTL_SEC = 60;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.guid().safeParse(id).success) {
    return problem(400, 'invalid-request', 'Invalid material id', '잘못된 자료 ID입니다.');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return problem(401, 'unauthorized', 'Login required', '로그인이 필요합니다.');
  }

  // RLS: 활성 수강권 보유자 또는 관리자만 행이 조회된다.
  // 조회 실패 = 접근 불가 → 존재 여부를 숨긴 채 403.
  const { data: material } = await supabase
    .from('materials')
    .select('id, storage_path, title, lessons!inner(course_id)')
    .eq('id', id)
    .maybeSingle();
  if (!material) {
    return problem(403, 'no-access', 'No access to material', '이 자료를 받을 권한이 없습니다.');
  }

  // 방어적 재확인 (RLS와 이중 방어). 환불로 enrollments.status가 바뀌면 여기서 차단된다.
  // has_course_access는 enrollments만 보므로, RLS가 허용하는 운영자(materials_select_enrolled의
  // is_admin 분기)를 여기서 되막지 않도록 함께 확인한다 — 운영자가 올린 자료를 검증할 수 있어야 한다.
  const courseId = (material as unknown as { lessons: { course_id: string } }).lessons.course_id;
  const [{ data: hasAccess }, { data: isAdmin }] = await Promise.all([
    supabase.rpc('has_course_access', { p_course_id: courseId }),
    supabase.rpc('is_admin'),
  ]);
  if (!hasAccess && !isAdmin) {
    return problem(403, 'no-access', 'No access to material', '이 자료를 받을 권한이 없습니다.');
  }

  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from('course-materials')
    .createSignedUrl(material.storage_path, SIGNED_URL_TTL_SEC, { download: true });
  if (error || !signed) {
    return problem(
      500,
      'signed-url-failed',
      'Signed URL failed',
      error?.message ?? '다운로드 주소를 발급하지 못했습니다.',
    );
  }

  return NextResponse.json({
    url: signed.signedUrl,
    expiresAt: Date.now() + SIGNED_URL_TTL_SEC * 1000,
  });
}
