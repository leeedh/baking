import PlayerScreen from '@/components/PlayerScreen';
import { getLearnPageData } from '@/lib/lessons';
import { getLocale } from 'next-intl/server';

// 세션 쿠키로 수강권을 판별하므로 요청마다 동적 렌더.
// 비로그인도 접근 가능(무료 미리보기 차시) — 잠금은 purchased 기준.
export const dynamic = 'force-dynamic';

export default async function LearnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();

  const { purchased, chapters, progress, watermarkLabel } = await getLearnPageData(id, locale);

  return (
    <PlayerScreen
      classId={id}
      purchased={purchased}
      chapters={chapters}
      progress={progress}
      watermarkLabel={watermarkLabel}
    />
  );
}
