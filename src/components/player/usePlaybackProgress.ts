'use client';

import { useCallback, useRef } from 'react';

/**
 * 진도 저장 훅 (TS-ARCH-04 / TS-PERF-04): timeupdate 를 ~10초 간격으로 디바운스해
 * POST /api/progress 에 upsert. lessonId 변경 시 SecureVideoPlayer가 remount(key)되어
 * 내부 ref가 자연 초기화된다.
 */
export function usePlaybackProgress(lessonId: string) {
  const lastSentRef = useRef(0);
  const latestRef = useRef(0);

  const post = useCallback(
    (watchedSec: number, completed: boolean) => {
      fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, watchedSec: Math.floor(watchedSec), completed }),
        keepalive: true, // 페이지 이탈·언마운트 중에도 마지막 위치 전송 보장
      }).catch(() => {});
    },
    [lessonId],
  );

  /** 재생 중 주기 호출 — 10초 이상 진행됐을 때만 서버 전송. */
  const report = useCallback(
    (currentSec: number) => {
      latestRef.current = currentSec;
      const now = Math.floor(currentSec);
      if (now - lastSentRef.current >= 10) {
        lastSentRef.current = now;
        post(now, false);
      }
    },
    [post],
  );

  /** 즉시 저장 (완주·언마운트 시). */
  const flush = useCallback(
    (completed = false) => {
      post(latestRef.current, completed);
    },
    [post],
  );

  return { report, flush };
}
