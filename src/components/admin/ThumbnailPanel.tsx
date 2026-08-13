'use client';

import { readError } from '@/lib/api/read-error';
import { ImageIcon, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useRef, useState } from 'react';

/**
 * 온라인 클래스 목록·상세에 나가는 커버 이미지.
 *
 * 업로드는 공개 버킷(course-images)이지만 클라이언트 쓰기 정책이 없어 반드시 서버 라우트를
 * 경유한다(자료 PDF와 같은 구조). 성공 시 서버가 카탈로그 캐시를 무효화하므로 목록에 곧바로
 * 반영된다.
 */
export default function ThumbnailPanel({
  courseId,
  thumbnailUrl,
}: {
  courseId: string;
  thumbnailUrl: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const send = async (file: File) => {
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/thumbnail`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      router.refresh();
    } catch {
      setError('이미지를 업로드하지 못했습니다. 네트워크 상태를 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void send(file);
  };

  return (
    <div className="space-y-3">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-xs font-semibold text-terracotta-deep"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="w-full sm:w-56 aspect-video rounded-xl overflow-hidden border border-brown-light bg-cream shrink-0">
          {thumbnailUrl ? (
            // 외부 URL(seed)과 Storage URL이 섞여 있어 next/image 최적화 대상에서 제외한다.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt="현재 커버 이미지"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-brown-medium/50">
              <ImageIcon size={28} aria-hidden />
            </div>
          )}
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex-1 w-full rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
            dragOver ? 'border-terracotta bg-terracotta/5' : 'border-brown-light bg-white'
          }`}
        >
          <p className="text-xs text-brown-medium mb-2">
            이미지를 이곳에 끌어다 놓거나 파일을 선택하세요.
          </p>
          <p className="text-[11px] text-brown-medium/70 mb-3">JPG · PNG · WebP · 5MB 이하</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1 px-3 py-2 bg-terracotta text-white text-[11px] font-bold rounded-lg hover:bg-terracotta-deep disabled:opacity-50 cursor-pointer"
          >
            <Upload size={12} aria-hidden /> {busy ? '업로드 중…' : '이미지 선택'}
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ''; // 같은 파일 재선택 허용
          if (file) void send(file);
        }}
      />
    </div>
  );
}
