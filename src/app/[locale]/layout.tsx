import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { routing } from '@/i18n/routing';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { getMessages } from 'next-intl/server';
import { Fraunces } from 'next/font/google';
import { notFound } from 'next/navigation';
import '../globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: 'Atelier Crème — Premium French Baking Atelier',
  description: 'Atelier Crème 베이킹 마스터클래스 — 평생 소장 VOD 아틀리에.',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }
  const messages = await getMessages();
  const t = await getTranslations('common');

  return (
    <html lang={locale} className={fraunces.variable}>
      <body className="flex flex-col min-h-screen bg-cream text-brown font-sans">
        <NextIntlClientProvider messages={messages}>
          {/* 카탈로그 SSG 유지를 위해 레이아웃은 쿠키를 읽지 않는다(정적).
              초기 user는 null로 두고 클라이언트 AuthProvider가 세션 쿠키로 하이드레이션.
              실제 보호는 각 페이지의 서버 가드 + RLS가 담당. */}
          <AuthProvider initialUser={null}>
            {/* 키보드 사용자가 매 페이지에서 내비를 통과하지 않도록 — 포커스될 때만 보인다. */}
            <a href="#main" className="skip-link">
              {t('skipToContent')}
            </a>
            <Header />
            <main id="main" className="flex-grow pb-24">
              {children}
            </main>
            <Footer />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
