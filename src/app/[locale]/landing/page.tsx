import LandingScreen from '@/components/landing/LandingScreen';
import { getCatalog } from '@/lib/catalog';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Bodoni_Moda } from 'next/font/google';

/**
 * 홈(`/`)을 대체하지 않는 랜딩 후보.
 * 비교용 경로이며 내비·홈 버튼에는 연결하지 않는다. 검색 노출도 막는다.
 */
export const revalidate = 3600;

const bodoni = Bodoni_Moda({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-landing-display',
  display: 'swap',
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('landing');
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false, follow: false },
  };
}

export default async function LandingCandidatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const classes = await getCatalog(locale);
  return (
    <div className={bodoni.variable}>
      <LandingScreen classes={classes} />
    </div>
  );
}
