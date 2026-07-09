import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { routing } from '@/i18n/routing';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
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

  return (
    <html lang={locale} className={fraunces.variable}>
      <body className="flex flex-col min-h-screen bg-[#FAF4EA] text-[#2A211B] font-sans">
        <NextIntlClientProvider messages={messages}>
          {/* 카탈로그 SSG 유지를 위해 레이아웃은 쿠키를 읽지 않는다(정적).
              초기 user는 null로 두고 클라이언트 AuthProvider가 세션 쿠키로 하이드레이션.
              실제 보호는 각 페이지의 서버 가드 + RLS가 담당. */}
          <AuthProvider initialUser={null}>
            <Header />
            <main className="flex-grow pb-24">{children}</main>
            <Footer />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
