import DetailScreen from '@/components/DetailScreen';

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DetailScreen classId={id} />;
}
