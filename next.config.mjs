import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// 커버 이미지는 Supabase Storage(공개 course-images 버킷)에서 온다. 호스트를 하드코딩하면
// 프로젝트를 옮길 때 next/image가 조용히 막으므로 env에서 뽑는다(빌드 타임에 한 번 평가).
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // 시드 데이터의 외부 이미지(위)와 운영자가 올린 커버(아래)가 공존한다.
      ...(supabaseHost
        ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
        : []),
    ],
  },
};

export default withNextIntl(nextConfig);
