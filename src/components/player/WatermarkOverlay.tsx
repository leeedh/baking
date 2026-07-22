'use client';

import { useEffect, useState } from 'react';

interface WatermarkOverlayProps {
  /** 이미 서버에서 부분 마스킹된 식별자 (예: j***@e***). */
  label: string;
}

// PRD-F-06.2 / TS-SEC-04 · 클라이언트 오버레이 워터마크.
// 위치를 주기적으로 이동시켜 크롭·가림을 어렵게 하고, pointer-events-none 으로 재생 조작을 방해하지 않는다.
const POSITIONS = [
  { top: '8%', left: '10%' },
  { top: '12%', right: '10%' },
  { bottom: '14%', left: '12%' },
  { bottom: '10%', right: '12%' },
] as const;

export default function WatermarkOverlay({ label }: WatermarkOverlayProps) {
  const [posIndex, setPosIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPosIndex((i) => (i + 1) % POSITIONS.length);
    }, 7000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <span
        className="absolute font-mono text-[11px] text-white/40 tracking-wider select-none transition-all duration-1000"
        style={POSITIONS[posIndex]}
      >
        {label}
      </span>
    </div>
  );
}
