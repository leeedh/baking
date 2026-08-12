import { assertSameOrigin } from '@/lib/api/origin';
import { problem, problemWithCause } from '@/lib/api/problem';
import { requireAdmin } from '@/lib/auth/require-admin';
import { CATALOG_TAG } from '@/lib/cache-tags';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// 클래스 커버 이미지 업로드. course-images는 공개 버킷이지만 쓰기 정책이 없어
// 파일은 반드시 이 라우트(service_role)를 경유한다(materials 라우트와 같은 구조).
const BUCKET = 'course-images';
const MAX_BYTES = 5 * 1024 * 1024; // 버킷 file_size_limit과 동일
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Storage 키로 안전한 파일명 — 한글·공백·경로 문자를 제거한다. */
function safeName(name: string, mime: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '-');
  return `${base.slice(0, 60) || 'cover'}.${EXT[mime]}`;
}

/**
 * 매직바이트로 실제 이미지 형식을 확인한다. file.type은 클라이언트가 보낸 값이고
 * 버킷의 allowed_mime_types도 우리가 지정한 contentType을 믿으므로, 내용을 직접 본다.
 */
function sniff(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...Array.from(bytes.slice(from, to)));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/**
 * 이전 커버가 우리 버킷의 객체면 그 키를 돌려준다(교체 시 정리용).
 * seed의 외부 URL(Unsplash 등)은 우리 것이 아니므로 건드리지 않는다.
 */
function ownedStorageKey(url: string | null): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const at = url.indexOf(marker);
  if (at === -1) return null;
  const key = url.slice(at + marker.length).split('?')[0];
  return key ? decodeURIComponent(key) : null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // multipart는 CORS-simple이라 프리플라이트가 없다 — SameSite 쿠키 외에 방어를 한 겹 더 둔다.
  const crossOrigin = assertSameOrigin(request);
  if (crossOrigin) return crossOrigin;

  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!z.guid().safeParse(id).success) {
    return problem(400, 'invalid-request', 'Invalid course id', '잘못된 클래스 ID입니다.');
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return problem(400, 'invalid-request', 'File required', '이미지 파일을 선택해 주세요.');
  }
  if (file.size > MAX_BYTES) {
    return problem(413, 'file-too-large', 'File too large', '이미지는 5MB 이하만 가능합니다.');
  }

  const mime = sniff(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
  if (!mime || !ALLOWED_MIME.includes(mime as (typeof ALLOWED_MIME)[number])) {
    return problem(
      415,
      'unsupported-type',
      'Image only',
      'JPG · PNG · WebP 이미지만 업로드할 수 있습니다.',
    );
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

  const path = `${course.id}/${crypto.randomUUID()}-${safeName(file.name, mime)}`;
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: mime, upsert: false });
  if (uploadError) {
    return problem(500, 'upload-failed', 'Upload failed', '이미지를 업로드하지 못했습니다.');
  }

  const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { error } = await admin
    .from('courses')
    .update({ thumbnail_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', course.id);
  if (error) {
    // 메타 갱신 실패 시 고아 파일이 남지 않도록 업로드를 되돌린다(materials와 동일).
    await admin.storage.from(BUCKET).remove([path]);
    return problemWithCause(
      500,
      'course-update-failed',
      'Course update failed',
      '썸네일을 저장하지 못했습니다.',
      error,
    );
  }

  // 교체 성공 후에야 이전 객체를 지운다(실패해도 새 커버는 이미 유효하므로 무시).
  const stale = ownedStorageKey(course.thumbnail_url);
  if (stale && stale !== path) await admin.storage.from(BUCKET).remove([stale]);

  // DC-51 · 커버 이미지는 카탈로그 카드에 그대로 나간다.
  revalidateTag(CATALOG_TAG);

  return NextResponse.json({ thumbnailUrl: publicUrl });
}
