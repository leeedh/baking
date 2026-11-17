import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

// DC-96 · TS-COMP-S7. 홈·소개·온라인 클래스 3면 공통 뉴스레터 CTA(기존 랜딩 하단 섹션 추출).
//
// 구독 백엔드가 아직 없다. 예전에는 버튼이 alert()로 "구독되었습니다"라고 거짓 성공을
// 알렸는데, 실제로 저장되는 곳이 없으므로 지금은 준비 중임을 명시하고 문의사항으로 유도한다.
export default function NewsletterCTA() {
  const t = useTranslations('sections.newsletter');
  return (
    <section
      aria-labelledby="newsletter-heading"
      className="bg-brown text-cream py-16 px-6 sm:px-12 rounded-t-[2.5rem] relative overflow-hidden"
    >
      <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
        <h2
          id="newsletter-heading"
          className="font-serif text-3xl sm:text-5xl font-bold leading-tight break-keep"
        >
          {t('headingPrefix')} {t('headingEm')}
          {t('headingSuffix')}
        </h2>
        <p className="text-xs sm:text-sm text-white/80 max-w-xl mx-auto font-light leading-relaxed break-keep">
          {t('description')}
        </p>

        <div className="pt-4 max-w-md mx-auto space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-start">
            <Input
              type="email"
              label={t('emailLabel')}
              hideLabel
              disabled
              placeholder={t('emailPlaceholder')}
              wrapperClassName="flex-1 w-full"
              className="bg-white/10 text-white placeholder:text-white/60 border-cream/50"
            />
            <Button variant="secondary" disabled className="w-full sm:w-auto shrink-0">
              {t('submitPending')}
            </Button>
          </div>
          <p className="text-xs text-white/80 font-light">
            {t('noticePrefix')}{' '}
            <Link
              href="/inquiries"
              className="font-bold text-gold underline underline-offset-2 hover:text-cream transition-colors rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {t('noticeLink')}
            </Link>
            {t('noticeSuffix')}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs text-white/80 pt-8 border-t border-white/10">
          <span>{t('perk1')}</span>
          <span>{t('perk2')}</span>
        </div>
      </div>
    </section>
  );
}
