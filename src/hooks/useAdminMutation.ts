'use client';

import { useToast } from '@/components/ui/Toast';
import { readError } from '@/lib/api/read-error';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

interface RunOptions {
  /** 성공 시 띄울 토스트 문구. 없으면 조용히 성공한다(목록만 갱신). */
  successMessage?: string;
}

/**
 * 운영자 콘솔의 쓰기 액션 공통 실행기.
 *
 * fetch가 throw해도 finally에서 busy를 반드시 푼다 — 예전에는 액션마다 setBusy(false)를
 * 수동으로 불러서, 네트워크 예외가 나면 화면이 "처리 중"으로 고착돼 다음 작업을 못 했다
 * (코드리뷰 X-3). DashboardScreen과 LessonManager에 같은 코드가 복제돼 있던 것을 모았다.
 *
 * 실패는 인라인 오류(폼 맥락에 붙어 있어야 한다)로, 성공은 토스트로 알린다 —
 * 이전에는 성공 채널이 아예 없어 "됐는지" 알 방법이 목록 변화뿐이었다.
 *
 * 문구가 한국어 리터럴인 것은 의도다 — 운영자 콘솔은 i18n 범위 밖이다(CLAUDE.md).
 */
export function useAdminMutation() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runMutation = useCallback(
    async (request: () => Promise<Response>, options?: RunOptions): Promise<boolean> => {
      setBusy(true);
      setError(null);
      try {
        const res = await request();
        if (!res.ok) {
          setError(await readError(res));
          return false;
        }
        router.refresh();
        if (options?.successMessage) {
          toast({ tone: 'success', message: options.successMessage });
        }
        return true;
      } catch {
        setError('요청을 처리하지 못했습니다. 네트워크 상태를 확인해 주세요.');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [router, toast],
  );

  return { busy, error, setError, runMutation };
}
