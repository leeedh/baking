import { assertSameOrigin } from '@/lib/api/origin';
import { problem, problemWithCause } from '@/lib/api/problem';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// DC-58 · 자료 삭제. 메타 행을 먼저 지우고 Storage 오브젝트를 지운다.
// 중간에 실패하면 고아 파일이 남지만(사용자 영향 없음), 반대 순서로 하면 파일 없는 행이 남아
// 수강생의 다운로드가 500으로 깨진다 — 사용자에게 보이는 쪽을 피한다.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const crossOrigin = assertSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!z.guid().safeParse(id).success) {
    return problem(400, 'invalid-request', 'Invalid material id', '잘못된 자료 ID입니다.');
  }

  const admin = createAdminClient();
  const { data: material } = await admin
    .from('materials')
    .select('id, storage_path')
    .eq('id', id)
    .maybeSingle();
  if (!material) {
    return problem(404, 'material-not-found', 'Material not found', '자료를 찾을 수 없습니다.');
  }

  const { error } = await admin.from('materials').delete().eq('id', id);
  if (error) {
    return problemWithCause(
      500,
      'material-delete-failed',
      'Material deletion failed',
      '자료를 삭제하지 못했습니다.',
      error,
    );
  }

  const { error: removeError } = await admin.storage
    .from('course-materials')
    .remove([material.storage_path]);
  if (removeError) {
    return problem(500, 'storage-delete-failed', 'Storage delete failed', removeError.message);
  }

  return NextResponse.json({ ok: true });
}
