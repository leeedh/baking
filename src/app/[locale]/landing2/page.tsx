import LandingScreen from '@/components/landing/LandingScreen';
import { landingDisplayFont } from '@/components/landing/font';
import { FLAMINGO_ASSET } from '@/components/landing/scrub-assets';
import { getCatalog } from '@/lib/catalog';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

/**
 * `/landing`의 영상만 바꾼 비교 경로. 카피·섹션·메타는 전부 같다 —
 * 영상 하나만 다르게 두어야 어느 쪽이 나은지 판단할 수 있다.
 * 내비나 홈 버튼에 연결하지 않고 검색 노출도 막는다.
 */
export const revalidate = 3600;

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

export default async function LandingCandidateTwoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const classes = await getCatalog(locale);
  return (
    <div className={landingDisplayFont.variable}>
      <LandingScreen classes={classes} scrubAsset={FLAMINGO_ASSET} />
    </div>
  );
}
