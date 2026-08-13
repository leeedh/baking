'use client';

import { useRouter } from '@/i18n/navigation';
import { readError } from '@/lib/api/read-error';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Plus } from 'lucide-react';
import { useState } from 'react';

/**
 * 온라인 클래스 목록에서 바로 클래스를 추가한다(운영자 전용).
 *
 * 예전에는 운영 대시보드에만 있었다. 운영자가 실제로 클래스를 만들고 싶어지는 순간은
 * **목록을 보고 있을 때**라, 대시보드로 건너갔다 오는 왕복이 그대로 낭비였다.
 *
 * ⚠️ 역할 판정을 서버에서 하지 않는 것은 의도다. 이 페이지의 목록은 `unstable_cache`로
 * 캐시되며(`lib/catalog.ts`), 렌더에 세션 판정이 섞이면 한 사람의 판정이 캐시에 얼어붙어
 * 다른 사용자에게 나갈 수 있다. 그래서 헤더가 운영자 메뉴를 숨기는 것과 같은 방식으로
 * 클라이언트에서만 판정한다. 진짜 방어는 `requireAdmin()`(POST /api/admin/courses)이며,
 * 여기서 버튼을 숨기는 것은 표시일 뿐이다.
 */
export default function AddClassButton() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 판정 전에 그리면 일반 사용자에게 버튼이 잠깐 번쩍인다.
  if (loading || !isAdmin) return null;

  const createClass = async () => {
    setError(null);
    setCreating(true);
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titleKo: '제목 없는 클래스', priceKrw: 0 }),
      });
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      const { id } = (await res.json()) as { id: string };
      router.push(`/admin/courses/${id}`);
    } catch {
      setError('클래스를 만들지 못했습니다. 네트워크 상태를 확인해 주세요.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-12 pt-4 flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={creating}
        onClick={createClass}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-terracotta text-cream text-xs font-bold rounded-lg hover:bg-terracotta-deep transition-colors disabled:opacity-50 cursor-pointer"
      >
        <Plus size={14} aria-hidden /> {creating ? '준비 중…' : '새 클래스 등록'}
      </button>
      {error && (
        <p role="alert" className="text-[11px] font-semibold text-terracotta-deep">
          {error}
        </p>
      )}
    </div>
  );
}
