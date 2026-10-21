import LandingScreen from '@/components/landing/LandingScreen';
import type { ScrubAsset } from '@/components/landing/LandingScrubHero';
import { landingDisplayFont } from '@/components/landing/font';
import { getCatalog } from '@/lib/catalog';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

/**
 * `/landing`의 영상만 바꾼 비교 경로. 카피·섹션·메타는 전부 같다 —
 * 영상 하나만 다르게 두어야 어느 쪽이 나은지 판단할 수 있다.
 * 내비나 홈 버튼에 연결하지 않고 검색 노출도 막는다.
 */
export const revalidate = 3600;

/**
 * 1280x720 가로 영상. 컨테이너를 `object-fit: cover`로 채우므로 세로 화면에서는
 * 좌우가 크게 잘린다(`landing.css`의 `.landing-scrub__video`).
 *
 * 원본은 `assets/source/flamingo2.mp4`(2560x1440, 10.125초, 24fps)다 — 키프레임이
 * 첫 프레임 하나뿐이라 임의 지점 seek마다 처음부터 디코딩했다. 아래 파일은
 * 케이크 영상과 같은 규격으로 재인코딩한 것이다: 720p · 전 프레임 키프레임
 * (`-g 1`) · 오디오 제거 · faststart(moov 앞으로). 243프레임 그대로다.
 * 포스터는 뽑아 두지 않았다 — 모션 감소 분기는 빈 자리만 남긴다.
 */
const FLAMINGO: ScrubAsset = {
  src: '/landing/flamingo2-scrub.mp4',
  duration: 10,
  fps: 24,
};

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
      <LandingScreen classes={classes} scrubAsset={FLAMINGO} />
    </div>
  );
}
