import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Link } from '@/i18n/navigation';

// DC-96 · TS-COMP-S7. 홈·소개·온라인 클래스 3면 공통 뉴스레터 CTA(기존 랜딩 하단 섹션 추출).
//
// 구독 백엔드가 아직 없다. 예전에는 버튼이 alert()로 "구독되었습니다"라고 거짓 성공을
// 알렸는데, 실제로 저장되는 곳이 없으므로 지금은 준비 중임을 명시하고 문의사항으로 유도한다.
export default function NewsletterCTA() {
  return (
    <section
      aria-labelledby="newsletter-heading"
      className="bg-brown text-cream py-16 px-6 sm:px-12 rounded-t-[2.5rem] relative overflow-hidden"
    >
      {/* Decorative corner pastries vector overlay watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
        <p className="text-xs font-bold text-gold tracking-[0.3em] uppercase">
          Atelier Crème Atelier Signature
        </p>
        <h2
          id="newsletter-heading"
          className="font-serif text-3xl sm:text-5xl font-bold leading-tight break-keep"
        >
          일상을 특별한 예술로 바꾸는 프랑스 가치, 지금 당신의 아이디로{' '}
          <span className="font-serif italic text-gold">아틀리에</span>에 가입하세요
        </h2>
        <p className="text-xs sm:text-sm text-white/80 max-w-xl mx-auto font-light leading-relaxed break-keep">
          프리미엄 정통 콩피츄르와 머랭 습도 보정을 한 손에 거머쥐는 순간, 동네 골목 디저트 숍의
          판도가 변합니다. 단 한 번의 구매로 평생 소장권을 확보하고 장인 쉐프들의 직강 세션에
          합류하세요.
        </p>

        <div className="pt-4 max-w-md mx-auto space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-start">
            <Input
              type="email"
              label="뉴스레터 구독 이메일"
              hideLabel
              disabled
              placeholder="뉴스레터 레시피 구독 이메일 주소..."
              wrapperClassName="flex-1 w-full"
              className="bg-white/10 text-white placeholder:text-white/40 border-white/15"
            />
            <Button variant="secondary" disabled className="w-full sm:w-auto shrink-0">
              구독 준비 중
            </Button>
          </div>
          <p className="text-[11px] text-white/70 font-light">
            뉴스레터 발송 채널을 준비하고 있습니다. 지금은{' '}
            <Link
              href="/inquiries"
              className="font-bold text-gold underline underline-offset-2 hover:text-cream transition-colors rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              문의사항
            </Link>
            으로 남겨 주시면 오픈 시 개별 안내드립니다.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-[11px] text-white/70 pt-8 border-t border-white/10">
          <span>• 오프라인 아카데미 서울 / 타이베이 동시 제휴</span>
          <span>• 카카오톡 및 이메일 24시간 피드백 지원</span>
        </div>
      </div>
    </section>
  );
}
