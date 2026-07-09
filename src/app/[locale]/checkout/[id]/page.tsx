import PaymentScreen from '@/components/PaymentScreen';
import { getUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const user = await getUser();
  if (!user) redirect(`/${locale}/login`);
  return <PaymentScreen classId={id} />;
}
