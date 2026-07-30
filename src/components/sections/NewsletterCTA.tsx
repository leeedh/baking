'use client';

// DC-96 · TS-COMP-S7. 홈·소개·온라인 클래스 3면 공통 뉴스레터 CTA(기존 랜딩 하단 섹션 추출).
export default function NewsletterCTA() {
  return (
    <section className="bg-brown text-cream py-16 px-6 sm:px-12 rounded-t-[2.5rem] relative overflow-hidden">
      {/* Decorative corner pastries vector overlay watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
        <span className="text-xs font-bold text-gold tracking-[0.3em] uppercase block">
          Atelier Crème Atelier Signature
        </span>
        <h2 className="font-serif text-3xl sm:text-5xl font-bold leading-tight break-keep">
          일상을 특별한 예술로 바꾸는 프랑스 가치, 지금 당신의 아이디로{' '}
          <span className="font-serif italic text-gold">아틀리에</span>에 가입하세요
        </h2>
        <p className="text-xs sm:text-sm text-white/70 max-w-xl mx-auto font-light leading-relaxed break-keep">
          프리미엄 정통 콩피츄르와 머랭 습도 보정을 한 손에 거머쥐는 순간, 동네 골목 디저트 숍의
          판도가 변합니다. 단 한 번의 구매로 평생 소장권을 확보하고 장인 쉐프들의 직강 세션에
          합류하세요.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3 max-w-sm mx-auto">
          <input
            type="email"
            placeholder="뉴스레터 레시피 구독 이메일 주소..."
            className="px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:ring-1 focus:ring-gold border border-white/10"
          />
          <button
            type="button"
            onClick={() => {
              alert('Atelier Crème 무료 시즌 레시피 메일 구독이 신청되었습니다!');
            }}
            className="bg-gold text-white py-3 px-5 rounded-xl text-xs font-bold hover:bg-terracotta transition-colors"
          >
            무료 레시피 구독
          </button>
        </div>

        <div className="flex justify-center gap-8 text-[11px] text-white/50 pt-8 border-t border-white/5">
          <span>• 오프라인 아카데미 서울 / 타이베이 동시 제휴</span>
          <span>• 카카오톡 및 이메일 24시간 피드백 지원</span>
        </div>
      </div>
    </section>
  );
}
