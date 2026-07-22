'use client';

import MuxPlayer from '@mux/mux-player-react';
import { Loader2, Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import WatermarkOverlay from './WatermarkOverlay';
import { usePlaybackProgress } from './usePlaybackProgress';

interface SecureVideoPlayerProps {
  lessonId: string;
  /** 서버에서 부분 마스킹된 워터마크 식별자. */
  watermarkLabel: string;
  /** 이어보기 시작 위치(초). */
  initialWatchedSec: number;
  title: string;
}

type TokenState =
  | { status: 'loading' }
  | { status: 'ready'; playbackId: string; token: string }
  | { status: 'error'; message: string };

export default function SecureVideoPlayer({
  lessonId,
  watermarkLabel,
  initialWatchedSec,
  title,
}: SecureVideoPlayerProps) {
  const [state, setState] = useState<TokenState>({ status: 'loading' });
  const { report, flush } = usePlaybackProgress(lessonId);
  const flushRef = useRef(flush);
  flushRef.current = flush;

  // 차시 진입 시 서명 재생 토큰 발급 (TS-API-12).
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    fetch('/api/playback/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!active) return;
        if (!res.ok) {
          setState({
            status: 'error',
            message: body?.detail ?? '영상을 불러올 수 없습니다.',
          });
          return;
        }
        setState({ status: 'ready', playbackId: body.playbackId, token: body.token });
      })
      .catch(() => {
        if (active) {
          setState({ status: 'error', message: '네트워크 오류로 영상을 불러오지 못했습니다.' });
        }
      });
    return () => {
      active = false;
    };
  }, [lessonId]);

  // 언마운트 시 마지막 위치 저장 (이어보기).
  useEffect(() => {
    return () => flushRef.current();
  }, []);

  // 다운로드·저장 단축키 캐주얼 방어 (PRD-F-06.1 — 완전 차단은 아님).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black text-white/70">
        <Loader2 size={28} className="animate-spin" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black px-6 text-center text-white/80">
        <Lock size={24} className="text-[#B65538]" />
        <p className="text-sm">{state.message}</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full" onContextMenu={(e) => e.preventDefault()}>
      <MuxPlayer
        playbackId={state.playbackId}
        tokens={{ playback: state.token }}
        startTime={initialWatchedSec}
        streamType="on-demand"
        metadata={{ video_title: title }}
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
        onTimeUpdate={(e) => report((e.target as unknown as HTMLMediaElement).currentTime)}
        onEnded={() => flush(true)}
      />
      <WatermarkOverlay label={watermarkLabel} />
    </div>
  );
}
