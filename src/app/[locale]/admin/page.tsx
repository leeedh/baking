import DashboardScreen from '@/components/DashboardScreen';
import { getProfile } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// 세션 쿠키를 읽는 role 가드이므로 요청마다 동적 렌더(정적 프리렌더 금지).
export const dynamic = 'force-dynamic';

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const profile = await getProfile();
  // 서버 role 가드: 비로그인 → 로그인, 비관리자 → 홈. (RLS가 데이터 접근도 이중 보호)
  if (!profile) redirect(`/${locale}/login`);
  if (profile.role !== 'admin') redirect(`/${locale}`);
  return <DashboardScreen />;
}
