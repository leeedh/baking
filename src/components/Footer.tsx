import { Link } from '@/i18n/navigation';
import { Globe, Mail, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

/** 홈 수강생 아카이브의 예시 사진 2장(Hallmark 라이브러리) — 라이선스상 출처 표기가 필요하다. */
const PHOTO_CREDITS = [
  {
    name: 'Sunny Ripert',
    license: 'CC BY-SA 2.0',
    href: 'https://commons.wikimedia.org/wiki/File:Arc-en-ciel_comestible.jpg',
  },
  {
    name: 'Ermell',
    license: 'CC BY-SA 4.0',
    href: 'https://commons.wikimedia.org/wiki/File:Tokio_Obsttorte_Modell-20091020-RM-101223.jpg',
  },
];

export default function Footer() {
  const t = useTranslations();
  return (
    <footer
      id="platform-footer"
      className="bg-brown text-cream/80 py-12 px-6 mt-auto border-t-4 border-terracotta"
    >
      <div
        id="footer-container"
        className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8"
      >
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-serif text-2xl font-bold tracking-tight text-cream">
              Atelier Crème
            </span>
            <span className="text-[11px] bg-gold text-brown px-1.5 py-0.5 rounded font-sans font-bold">
              VOD STUDIO
            </span>
          </div>
          <p className="text-sm font-light leading-relaxed max-w-md text-cream/70">
            {t('footer.intro')}
          </p>
          {/* 뉴스레터는 발송 채널이 없어 페이지 마지막 밴드에서 빠졌다(Hallmark 85). 안내만 한 줄로 남긴다. */}
          <p className="text-xs font-light leading-relaxed max-w-md text-cream/80">
            {t('sections.newsletter.noticePrefix')}{' '}
            <Link
              href="/inquiries"
              className="font-semibold text-gold underline underline-offset-2 hover:text-cream transition-colors rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {t('sections.newsletter.noticeLink')}
            </Link>
            {t('sections.newsletter.noticeSuffix')}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cream/70 py-2">
            <span className="flex items-center gap-1">
              <Globe size={12} /> {t('footer.languages')}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {t('footer.locations')}
            </span>
          </div>
        </div>

        <div>
          <h4 className="font-serif text-lg font-bold text-gold mb-4">
            {t('footer.benefitsTitle')}
          </h4>
          <ul className="space-y-2 text-xs font-light text-cream/70">
            {(t.raw('footer.benefits') as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-serif text-lg font-bold text-terracotta mb-4">
            {t('footer.supportTitle')}
          </h4>
          <ul className="space-y-2 text-xs font-light text-cream/70">
            <li className="flex items-center gap-1">
              <Mail size={12} /> support@ateliercreme.com
            </li>
            <li>{t('footer.supportHours')}</li>
            <li>{t('footer.supportPartnership')}</li>
            <li className="text-[11px] text-cream/60 mt-4 leading-normal">
              © 2026 Atelier Crème Inc. All rights reserved. <br />
              Atelier Crème is a premium educational brand powered by Antigravity.
            </li>
            <li className="text-[11px] text-cream/70 leading-normal">
              {t('footer.photoCredit')}:{' '}
              {PHOTO_CREDITS.map((c, i) => (
                <span key={c.href}>
                  {i > 0 && ', '}
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-cream rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {c.name}
                  </a>{' '}
                  ({c.license})
                </span>
              ))}
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
