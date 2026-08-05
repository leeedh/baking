'use client';

import { readError } from '@/lib/api/read-error';
import type { MyReview } from '@/types';
import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// DC-60 · 후기 작성/수정 폼. 권한 판정은 서버(RLS)가 하고, 여기서는 자격이 있는 사용자에게만
// 폼을 노출한다(비수강자가 API를 직접 호출해도 403).
type Props = {
  courseId: string;
  canReview: boolean;
  myReview: MyReview | null;
};

export default function ReviewForm({ courseId, canReview, myReview }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [rating, setRating] = useState(myReview?.rating ?? 5);
  const [content, setContent] = useState(myReview?.content ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canReview) {
    return (
      <p className="text-xs text-brown-medium/70 bg-cream border border-brown-light rounded-xl p-4">
        {t('review.notEnrolled')}
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
        {myReview ? t('review.titleEdit') : t('review.titleNew')}
      </h3>

      <fieldset className="flex items-center gap-1">
        <legend className="sr-only">{t('review.ratingLegend')}</legend>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={t('review.ratingAria', { star })}
            aria-pressed={star === rating}
            onClick={() => setRating(star)}
            className="p-0.5 cursor-pointer text-gold"
          >
            <Star size={18} className={star <= rating ? 'fill-gold' : 'opacity-25'} />
          </button>
        ))}
        <span className="ml-2 text-[11px] text-brown-medium">{t('review.ratingValue', { rating })}</span>
      </fieldset>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder={t('review.placeholder')}
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
          {myReview ? t('review.submitEdit') : t('review.submitNew')}
        </button>
        {myReview && (
          <button
            type="button"
            disabled={busy}
            onClick={() => submit('DELETE')}
            className="px-4 py-2 border border-brown-light hover:border-terracotta disabled:opacity-50 text-brown-medium text-xs rounded-lg transition-colors cursor-pointer"
          >
            {t('review.delete')}
          </button>
        )}
      </div>
    </div>
  );
}
