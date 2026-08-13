'use client';

import { readError } from '@/lib/api/read-error';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * 도서 판매 링크 인라인 수정(운영자 전용).
 *
 * 도서는 외부 커머스 큐레이션이라 자체 편집기가 없다 — 소개·표지·가격은 코드로 관리한다.
 * 다만 쿠팡 링크는 품절·개편·파트너스 파라미터 변경으로 자주 끊기는데, 그때마다 배포를
 * 기다리게 할 수는 없어 **링크 하나만** 화면에서 고칠 수 있게 열어 둔다.
 *
 * ⚠️ 역할 판정을 클라이언트에서 하는 것은 의도다(도서 목록이 캐시되므로 서버 렌더에 세션을
 * 섞지 않는다). 진짜 방어는 `requireAdmin()`(PATCH /api/admin/books/[slug])이다.
 */
export default function BookLinkEditor({
  slug,
  currentUrl,
}: {
  slug: string;
  currentUrl: string;
}) {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(currentUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading || !isAdmin) return null;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/books/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseUrl: url.trim() }),
      });
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError('판매 링크를 저장하지 못했습니다. 네트워크 상태를 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setUrl(currentUrl);
          setError(null);
          setOpen(true);
        }}
        className="text-[11px] font-bold text-gold-deep underline hover:text-terracotta"
      >
        판매 링크 수정
      </button>
    );
  }

  return (
    <div className="w-full rounded-lg border border-brown-light bg-cream px-3 py-3 space-y-2">
      <label htmlFor={`book-url-${slug}`} className="block text-[11px] font-bold text-brown">
        쿠팡 판매 링크 (파트너스 파라미터까지 그대로 붙여넣으세요)
      </label>
      <textarea
        id={`book-url-${slug}`}
        rows={3}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="w-full px-2 py-1.5 border border-brown-light rounded text-[11px] font-mono break-all"
      />
      {error && (
        <p role="alert" className="text-[11px] font-semibold text-terracotta-deep">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="px-3 py-1.5 bg-terracotta text-cream text-[11px] font-bold rounded disabled:opacity-50"
        >
          {busy ? '저장 중…' : '저장'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 border border-brown-light text-brown-medium text-[11px] font-bold rounded disabled:opacity-50"
        >
          취소
        </button>
      </div>
    </div>
  );
}
