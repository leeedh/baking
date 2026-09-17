'use client';

import { parseProblem, problemMessageKey } from '@/lib/api/problem-client';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

/**
 * DC-109 · 실패 응답을 현재 로케일의 안내 문구로 바꾼다.
 *
 * 서버 `detail`은 한국어 고정이라 고객 화면에 그대로 띄우면 `/en`에서 한국어가 나온다.
 * `type`으로 `errors.*`를 고르고, 매핑에 없으면 화면이 넘긴 `fallback`(이미 번역된 문구)을 쓴다.
 * 운영자 콘솔은 한국어 단일 사용자라 기존 `readError`(detail 표시)를 유지한다.
 */
export function useProblemMessage() {
  const t = useTranslations('errors');

  return useCallback(
    async (res: Response, fallback?: string): Promise<string> => {
      const body = await res.json().catch(() => null);
      const key = problemMessageKey(parseProblem(body));
      // 키는 매핑 테이블에서만 나오고, problem-client.test.ts가 ko/en 존재를 잠근다.
      return key ? t(key as 'generic') : (fallback ?? t('generic'));
    },
    [t],
  );
}
