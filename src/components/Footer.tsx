import { Globe, Mail, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
            <span className="text-[10px] bg-gold text-brown px-1.5 py-0.5 rounded font-sans font-bold">
              VOD STUDIO
            </span>
          </div>
          <p className="text-sm font-light leading-relaxed max-w-md text-cream/70">
            {t('footer.intro')}
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
          <h4 className="font-serif text-lg font-bold text-gold mb-4">{t('footer.benefitsTitle')}</h4>
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
          </ul>
        </div>
      </div>
    </footer>
  );
}
