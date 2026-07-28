/**
 * 라우트 전환 즉시 노출되는 경량 스켈레톤. 각 세그먼트의 loading.tsx가 이걸 렌더해
 * 서버 렌더 완료 전까지 화면이 정지된 것처럼 보이는 문제를 없앤다. 외부 요청·상태 없음.
 */
export default function PageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 animate-pulse" aria-hidden>
      {/* 상단 히어로/제목 영역 */}
      <div className="h-8 w-2/3 sm:w-1/3 rounded-lg bg-[#EFE8DC]" />
      <div className="mt-3 h-4 w-1/2 rounded bg-[#EFE8DC]/70" />

      {/* 카드 그리드 */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: 정적 플레이스홀더라 인덱스 키로 충분.
          <div key={i} className="rounded-2xl border border-[#EFE8DC] overflow-hidden bg-white/40">
            <div className="h-40 w-full bg-[#EFE8DC]" />
            <div className="p-4 space-y-3">
              <div className="h-5 w-3/4 rounded bg-[#EFE8DC]" />
              <div className="h-4 w-1/2 rounded bg-[#EFE8DC]/70" />
              <div className="h-4 w-1/3 rounded bg-[#EFE8DC]/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
