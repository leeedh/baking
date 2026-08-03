export type SkeletonVariant = 'grid' | 'table' | 'form' | 'detail';

interface PageSkeletonProps {
  /**
   * 들어올 화면의 골격에 맞춘다. 예전에는 grid 하나가 5개 라우트를 덮어
   * 관리자 테이블·체크아웃 폼에서 스켈레톤과 실제 레이아웃이 어긋났다.
   */
  variant?: SkeletonVariant;
}

/** 반복 플레이스홀더용 고정 키 — 인덱스 키를 피한다. */
const KEYS = ['a', 'b', 'c', 'd', 'e', 'f'] as const;

const Bar = ({ className }: { className: string }) => (
  <div className={`rounded bg-brown-light ${className}`} />
);

/**
 * 라우트 전환 즉시 노출되는 경량 스켈레톤. 각 세그먼트의 loading.tsx가 이걸 렌더해
 * 서버 렌더 완료 전까지 화면이 정지된 것처럼 보이는 문제를 없앤다. 외부 요청·상태 없음.
 */
export default function PageSkeleton({ variant = 'grid' }: PageSkeletonProps) {
  return (
    // 예전에는 래퍼가 aria-hidden이라 "로딩 중"이라는 사실 자체가 보조기술에 전달되지 않았다
    // (코드리뷰 L-5). 이제 래퍼가 상태를 알리고, 의미 없는 회색 막대만 숨긴다.
    // <output>은 role="status"의 시맨틱 요소다(div+role보다 이쪽을 쓰라는 a11y 규칙).
    <output
      aria-busy="true"
      className="block max-w-7xl mx-auto px-4 sm:px-8 py-10 animate-pulse"
    >
      <span className="sr-only">불러오는 중</span>
      <div aria-hidden>
      {/* 상단 히어로/제목 영역 — 모든 변형이 공유한다 */}
      <Bar className="h-8 w-2/3 sm:w-1/3" />
      <Bar className="mt-3 h-4 w-1/2 bg-brown-light/70" />

      {variant === 'grid' && (
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {KEYS.slice(0, 6).map((k) => (
            <div
              key={k}
              className="rounded-card border border-brown-light overflow-hidden bg-white/40"
            >
              <div className="h-40 w-full bg-brown-light" />
              <div className="p-4 space-y-3">
                <Bar className="h-5 w-3/4" />
                <Bar className="h-4 w-1/2 bg-brown-light/70" />
                <Bar className="h-4 w-1/3 bg-brown-light/70" />
              </div>
            </div>
          ))}
        </div>
      )}

      {variant === 'table' && (
        <>
          {/* KPI 카드 3개 + 테이블 패널 — 관리자 콘솔 골격 */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {KEYS.slice(0, 3).map((k) => (
              <div
                key={k}
                className="rounded-xl border border-brown-light bg-white/40 p-5 space-y-3"
              >
                <Bar className="h-3 w-1/3 bg-brown-light/70" />
                <Bar className="h-7 w-2/3" />
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-card border border-brown-light bg-white/40 overflow-hidden">
            <div className="p-6 border-b border-brown-light">
              <Bar className="h-5 w-40" />
            </div>
            {KEYS.slice(0, 6).map((k) => (
              <div key={k} className="px-6 py-4 border-b border-brown-light/60 flex gap-4">
                <Bar className="h-4 flex-1 bg-brown-light/70" />
                <Bar className="h-4 w-20 bg-brown-light/70" />
                <Bar className="h-4 w-16 bg-brown-light/70" />
              </div>
            ))}
          </div>
        </>
      )}

      {variant === 'form' && (
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 rounded-card border border-brown-light bg-white/40 p-6 space-y-5">
            {KEYS.slice(0, 4).map((k) => (
              <div key={k} className="space-y-2">
                <Bar className="h-3 w-24 bg-brown-light/70" />
                <Bar className="h-11 w-full" />
              </div>
            ))}
          </div>
          <div className="rounded-card border border-brown-light bg-white/40 p-6 space-y-4 h-fit">
            <Bar className="h-5 w-1/2" />
            <Bar className="h-4 w-full bg-brown-light/70" />
            <Bar className="h-4 w-2/3 bg-brown-light/70" />
            <Bar className="h-12 w-full" />
          </div>
        </div>
      )}

      {variant === 'detail' && (
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="aspect-[16/9] w-full rounded-card bg-brown-light" />
            <Bar className="h-5 w-1/2" />
            <Bar className="h-4 w-full bg-brown-light/70" />
            <Bar className="h-4 w-5/6 bg-brown-light/70" />
            <Bar className="h-4 w-2/3 bg-brown-light/70" />
          </div>
          <div className="rounded-card border border-brown-light bg-white/40 p-6 space-y-4 h-fit">
            <Bar className="h-7 w-2/3" />
            <Bar className="h-4 w-1/2 bg-brown-light/70" />
            <Bar className="h-12 w-full" />
          </div>
        </div>
      )}
      </div>
    </output>
  );
}
