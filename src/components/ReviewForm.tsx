'use client';

import type { MyReview } from '@/types';
import { Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// DC-60 · 후기 작성/수정 폼. 권한 판정은 서버(RLS)가 하고, 여기서는 자격이 있는 사용자에게만
// 폼을 노출한다(비수강자가 API를 직접 호출해도 403).
type Props = {
  courseId: string;
  canReview: boolean;
  myReview: MyReview | null;
};

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: string; title?: string };
    return body.detail ?? body.title ?? '요청을 처리하지 못했습니다.';
  } catch {
    return '요청을 처리하지 못했습니다.';
  }
}

export default function ReviewForm({ courseId, canReview, myReview }: Props) {
  const router = useRouter();
  const [rating, setRating] = useState(myReview?.rating ?? 5);
  const [content, setContent] = useState(myReview?.content ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canReview) {
    return (
      <p className="text-xs text-brown-medium/70 bg-cream border border-brown-light rounded-xl p-4">
        후기는 이 클래스를 수강 중인 분만 남길 수 있습니다.
      </p>
    );
  }

  const submit = async (method: 'POST' | 'PATCH' | 'DELETE') => {
    setBusy(true);
    setError(null);
    // DELETE는 본문 없이 쿼리로 — 일부 프록시가 DELETE 본문을 버린다.
    const res =
      method === 'DELETE'
        ? await fetch(`/api/reviews?courseId=${encodeURIComponent(courseId)}`, { method })
        : await fetch('/api/reviews', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId, rating, content: content.trim() }),
          });
    setBusy(false);
    if (!res.ok) {
      setError(await readError(res));
      return;
    }
    if (method === 'DELETE') {
      setRating(5);
      setContent('');
    }
    // 목록과 course_catalog 집계(평점·후기 수)를 서버에서 다시 읽어온다.
    router.refresh();
  };

  return (
    <div className="bg-white border border-brown-light rounded-xl p-4 space-y-3">
      <h3 className="text-xs font-bold text-brown">
        {myReview ? '내 후기 수정' : '수강 후기 남기기'}
      </h3>

      <fieldset className="flex items-center gap-1">
        <legend className="sr-only">별점 선택</legend>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`별점 ${star}점`}
            aria-pressed={star === rating}
            onClick={() => setRating(star)}
            className="p-0.5 cursor-pointer text-gold"
          >
            <Star size={18} className={star <= rating ? 'fill-gold' : 'opacity-25'} />
          </button>
        ))}
        <span className="ml-2 text-[11px] text-brown-medium">{rating}점</span>
      </fieldset>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="수강하며 느낀 점을 남겨주세요."
        className="w-full text-xs p-3 rounded-lg border border-brown-light bg-ivory text-brown resize-y"
      />

      {error && (
        <p role="alert" className="text-[11px] text-terracotta">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => submit(myReview ? 'PATCH' : 'POST')}
          className="px-4 py-2 bg-brown hover:bg-gold disabled:opacity-50 text-cream text-xs font-bold rounded-lg transition-colors cursor-pointer"
        >
          {myReview ? '수정하기' : '후기 등록'}
        </button>
        {myReview && (
          <button
            type="button"
            disabled={busy}
            onClick={() => submit('DELETE')}
            className="px-4 py-2 border border-brown-light hover:border-terracotta disabled:opacity-50 text-brown-medium text-xs rounded-lg transition-colors cursor-pointer"
          >
            삭제
          </button>
        )}
      </div>
    </div>
  );
}
