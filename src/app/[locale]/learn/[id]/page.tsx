import PlayerScreen from '@/components/PlayerScreen';

export default async function LearnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PlayerScreen classId={id} />;
}
