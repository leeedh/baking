// DC-96 · 상단 프로모션 고지 바. 기존 CatalogScreen 최상단 블록을 그대로 추출(홈 전용).
export default function AnnouncementBar() {
  return (
    <div className="bg-brown text-cream text-xs py-2 px-4 shadow-sm border-b border-cream/15">
      <div
        id="announcement-scroll"
        className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1"
      >
        <div className="flex items-start sm:items-center gap-2 min-w-0">
          <span className="shrink-0 bg-terracotta text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-widest uppercase">
            PROMO
          </span>
          <span className="text-[11px] font-light tracking-wide break-keep">
            Sugar Lane & Happy Happy Academy 콜라보 레퍼런스 오픈 기념 최대 45% 즉시 할인
          </span>
        </div>
        <div className="hidden md:flex items-center gap-4 text-[11px] text-white/80">
          <span>• 오너 셰프 1:1 디렉션 보증</span>
          <span>• 실전 상업용 황금 배합비 PDF 즉시 배포</span>
        </div>
      </div>
    </div>
  );
}
