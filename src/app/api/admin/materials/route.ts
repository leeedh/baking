import { assertSameOrigin } from '@/lib/api/origin';
import { problem, problemWithCause } from '@/lib/api/problem';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// DC-58 · 운영자 자료 업로드. 비공개 버킷에는 클라이언트 정책이 없으므로
// 파일은 반드시 이 라우트(service_role)를 경유해 올라간다.
const MAX_BYTES = 20 * 1024 * 1024; // 버킷 file_size_limit과 동일
const ALLOWED_MIME = 'application/pdf';

const FieldsSchema = z.object({
  lessonId: z.guid(),
  titleKo: z.string().trim().min(1).max(200),
  titleEn: z.string().trim().max(200).optional(),
});

/** Storage 키로 안전한 파일명 — 한글·공백·경로 문자를 제거한다. */
function safeName(name: string) {
  const base = name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '-');
  return `${base.slice(0, 60) || 'material'}.pdf`;
}

export async function POST(request: Request) {
  // multipart는 CORS-simple이라 프리플라이트가 없다 — SameSite 쿠키 외에 방어를 한 겹 더 둔다.
  const crossOrigin = assertSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const denied = await requireAdmin();
  if (denied) return denied;

  const form = await request.formData().catch(() => null);
  if (!form) {
    return problem(400, 'invalid-request', 'Invalid form data', '업로드 형식이 잘못되었습니다.');
  }

  const parsed = FieldsSchema.safeParse({
    lessonId: form.get('lessonId'),
    titleKo: form.get('titleKo'),
    titleEn: form.get('titleEn') ?? undefined,
  });
  if (!parsed.success) {
    return problem(400, 'invalid-request', 'Invalid fields', '요청 형식이 올바르지 않습니다.');
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return problem(400, 'invalid-request', 'File required', '파일을 선택해 주세요.');
  }
  if (file.type !== ALLOWED_MIME) {
    return problem(415, 'unsupported-type', 'PDF only', 'PDF 파일만 업로드할 수 있습니다.');
  }
  if (file.size > MAX_BYTES) {
    return problem(413, 'file-too-large', 'File too large', '파일은 20MB 이하만 가능합니다.');
  }
  // file.type은 클라이언트가 보낸 값이고 버킷의 allowed_mime_types도 우리가 지정한
  // contentType을 믿으므로, 실제 내용을 매직바이트로 확인한다.
  const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...signature) !== '%PDF-') {
    return problem(415, 'unsupported-type', 'PDF only', '유효한 PDF 파일이 아닙니다.');
  }

  const admin = createAdminClient();
  const { data: lesson } = await admin
    .from('lessons')
    .select('id, course_id')
    .eq('id', parsed.data.lessonId)
    .maybeSingle();
  if (!lesson) {
    return problem(404, 'lesson-not-found', 'Lesson not found', '차시를 찾을 수 없습니다.');
  }

  const path = `${lesson.course_id}/${lesson.id}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const { error: uploadError } = await admin.storage
    .from('course-materials')
    .upload(path, file, { contentType: ALLOWED_MIME, upsert: false });
  if (uploadError) {
    return problem(500, 'upload-failed', 'Upload failed', uploadError.message);
  }

  const { data: material, error } = await admin
    .from('materials')
    .insert({
      lesson_id: lesson.id,
      title: { ko: parsed.data.titleKo, en: parsed.data.titleEn || parsed.data.titleKo },
      storage_path: path,
      size_bytes: file.size,
      mime_type: ALLOWED_MIME,
    })
    .select('id, title, size_bytes')
    .single();
  if (error || !material) {
    // 메타 등록 실패 시 고아 파일이 남지 않도록 업로드를 되돌린다.
    await admin.storage.from('course-materials').remove([path]);
    return problemWithCause(
      500,
      'material-insert-failed',
      'Material insert failed',
      '자료를 등록하지 못했습니다.',
      error,
    );
  }

  return NextResponse.json(material, { status: 201 });
}
