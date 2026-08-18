'use client';

import { readError } from '@/lib/api/read-error';
import { useCallback, useEffect, useRef, useState } from 'react';

/** 차시별 영상 업로드 진행 상태. */
export type UploadState = {
  /**
   * 'warning'은 실패가 아니다 — 영상은 올라갔는데 재생시간만 못 받은 상태다. 실패로 칠하면
   * 운영자가 다시 올리게 되고, 조용히 넘기면 --:--인 이유를 알 수 없다.
   */
  phase: 'queued' | 'uploading' | 'encoding' | 'error' | 'warning';
  progress: number;
  message?: string;
};

/**
 * 브라우저 → Mux Direct Upload → 인코딩 완료까지를 차시 단위로 추적한다.
 *
 * 예전엔 이 3단계가 LessonManager 안에 인라인으로 있었고 한 번에 한 개만 올릴 수 있었다.
 * 편집기가 영상을 여러 개 한꺼번에 받으면서 (a) 동시 실행 제한과 (b) 화면을 떠났다 돌아왔을
 * 때의 폴링 재개가 필요해져 훅으로 뺐다.
 *
 * 완료 감지는 웹훅이 아니라 폴링이다(Mux 웹훅 미도입). 서버는 인코딩이 끝나는 순간에만
 * lessons에 자산·재생 ID와 **재생시간**을 기록하므로, 폴링이 끊겨도 데이터는 깨지지 않는다 —
 * 화면 표시만 뒤처지고, 재진입 시 pendingUploadId로 이어서 확인한다.
 */
const MAX_CONCURRENT = 2;
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_TRIES = 100; // ~5분

export function useVideoUpload(onLessonReady: () => void) {
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});

  // 언마운트 후 setState·요청을 막는다(코드리뷰 M-8). 업로드는 최대 수 분간 돈다.
  //
  // ⚠️ 플래그를 되돌리고 컨트롤러를 effect **안에서** 만드는 것이 핵심이다. 예전에는 정리
  // 함수만 있고(본문 없음) 컨트롤러는 렌더 중에 한 번 만들었는데, StrictMode(개발 기본값)가
  // 마운트 → 정리 → 재마운트를 돌리면서 **플래그가 true로 굳고 컨트롤러도 abort된 채로**
  // 남았다. 그 뒤로는 setUpload가 전부 무시돼 진행률이 화면에 아예 안 뜨고, 폴링 fetch는
  // 즉시 abort로 실패해 조용히 끝났다 — 파일은 Mux에 올라갔는데 결과를 받아 적을 사람이
  // 없어져, 재생 ID도 재생시간도 DB에 안 남았다(실제로 그 상태의 차시가 나왔다).
  const unmountedRef = useRef(false);
  const abortRef = useRef<AbortController>(new AbortController());
  useEffect(() => {
    unmountedRef.current = false;
    abortRef.current = new AbortController();
    const controller = abortRef.current;
    return () => {
      unmountedRef.current = true;
      controller.abort();
    };
  }, []);

  const activeRef = useRef(0);
  const queueRef = useRef<Array<() => Promise<void>>>([]);

  const setUpload = useCallback((lessonId: string, state: UploadState | null) => {
    if (unmountedRef.current) return;
    setUploads((prev) => {
      const next = { ...prev };
      if (state) next[lessonId] = state;
      else delete next[lessonId];
      return next;
    });
  }, []);

  /** 대기열에서 다음 작업을 꺼내 동시 실행 상한을 지킨다. */
  const pump = useCallback(() => {
    while (activeRef.current < MAX_CONCURRENT && queueRef.current.length > 0) {
      const job = queueRef.current.shift();
      if (!job) break;
      activeRef.current += 1;
      void job().finally(() => {
        activeRef.current -= 1;
        pump();
      });
    }
  }, []);

  /** 인코딩 완료까지 폴링. 완료되면 서버가 재생시간까지 채워둔 상태다. */
  const poll = useCallback(
    async (lessonId: string, uploadId: string) => {
      setUpload(lessonId, { phase: 'encoding', progress: 100 });
      for (let i = 0; i < POLL_MAX_TRIES; i++) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        if (unmountedRef.current) return;

        let res: Response;
        try {
          res = await fetch('/api/admin/mux/upload/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lessonId, uploadId }),
            signal: abortRef.current.signal,
          });
        } catch {
          // abort(화면 이탈)면 조용히 끝낸다 — 서버 쪽 인코딩은 그대로 진행된다.
          if (unmountedRef.current) return;
          setUpload(lessonId, {
            phase: 'error',
            progress: 100,
            message: '인코딩 상태를 확인하지 못했습니다. 잠시 후 새로고침해 확인하세요.',
          });
          return;
        }

        if (!res.ok) {
          setUpload(lessonId, { phase: 'error', progress: 100, message: await readError(res) });
          return;
        }
        const { state, reason, durationMissing } = (await res.json()) as {
          state: string;
          reason?: string;
          durationMissing?: boolean;
        };
        if (unmountedRef.current) return;
        if (state === 'ready') {
          setUpload(
            lessonId,
            durationMissing
              ? {
                  phase: 'warning',
                  progress: 100,
                  message: '재생시간을 가져오지 못했습니다. "다시 가져오기"를 눌러 주세요.',
                }
              : null,
          );
          onLessonReady();
          return;
        }
        if (state === 'errored') {
          // 사유는 서버가 구분해 내려준다(업로드 취소·시간 초과·인코딩 실패·재생 정책 이상).
          setUpload(lessonId, {
            phase: 'error',
            progress: 100,
            message: reason ?? 'Mux 인코딩에 실패했습니다. 다시 시도해 주세요.',
          });
          return;
        }
      }
      setUpload(lessonId, {
        phase: 'error',
        progress: 100,
        message: '인코딩이 지연되고 있습니다. 잠시 후 새로고침해 확인하세요.',
      });
    },
    [onLessonReady, setUpload],
  );

  /** 파일 하나를 특정 차시에 올린다(대기열 경유). */
  const upload = useCallback(
    (lessonId: string, file: File) => {
      setUpload(lessonId, { phase: 'queued', progress: 0 });
      queueRef.current.push(async () => {
        if (unmountedRef.current) return;
        setUpload(lessonId, { phase: 'uploading', progress: 0 });

        // 1) Direct Upload URL 발급(서버가 uploadId를 차시에 기록해 재진입 대비).
        let uploadUrl: string;
        let uploadId: string;
        try {
          const res = await fetch('/api/admin/mux/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lessonId }),
          });
          if (!res.ok) {
            setUpload(lessonId, { phase: 'error', progress: 0, message: await readError(res) });
            return;
          }
          ({ uploadUrl, uploadId } = (await res.json()) as {
            uploadUrl: string;
            uploadId: string;
          });
        } catch {
          setUpload(lessonId, {
            phase: 'error',
            progress: 0,
            message: '업로드를 시작하지 못했습니다. 네트워크 상태를 확인해 주세요.',
          });
          return;
        }

        // 2) 파일 PUT + 진행률(fetch로는 업로드 진행률을 못 읽어 XHR을 쓴다).
        try {
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', uploadUrl);
            xhr.upload.onprogress = (ev) => {
              if (ev.lengthComputable) {
                setUpload(lessonId, {
                  phase: 'uploading',
                  progress: Math.round((ev.loaded / ev.total) * 100),
                });
              }
            };
            xhr.onload = () =>
              xhr.status >= 200 && xhr.status < 300
                ? resolve()
                : reject(new Error(`업로드 실패 (HTTP ${xhr.status})`));
            xhr.onerror = () => reject(new Error('네트워크 오류로 업로드에 실패했습니다.'));
            xhr.send(file);
          });
        } catch (err) {
          setUpload(lessonId, {
            phase: 'error',
            progress: 0,
            message: err instanceof Error ? err.message : '업로드에 실패했습니다.',
          });
          return;
        }

        // 3) 인코딩 완료까지 폴링.
        await poll(lessonId, uploadId);
      });
      pump();
    },
    [poll, pump, setUpload],
  );

  /**
   * 이미 서버에 올라가 인코딩 중인 업로드의 상태만 이어서 확인한다(편집기 재진입).
   * 파일 전송 단계가 없으므로 대기열을 거치지 않는다 — 폴링은 요청이 가볍다.
   */
  const resume = useCallback(
    (lessonId: string, uploadId: string) => {
      void poll(lessonId, uploadId);
    },
    [poll],
  );

  return { uploads, upload, resume };
}
