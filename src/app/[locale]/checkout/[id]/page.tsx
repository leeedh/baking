import PaymentScreen from '@/components/PaymentScreen';

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PaymentScreen classId={id} />;
}
