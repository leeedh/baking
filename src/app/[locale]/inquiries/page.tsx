import InquiriesScreen from '@/components/InquiriesScreen';
import { getMyInquiries } from '@/lib/inquiries';
import { getUser } from '@/lib/supabase/server';

// DC-97 (PRD-F-21) · 문의사항. 세션 쿠키를 읽으므로 요청마다 동적 렌더(정적 프리렌더 금지).
export const dynamic = 'force-dynamic';

export default async function InquiriesPage() {
  // 비로그인도 FAQ는 볼 수 있어야 하므로 리다이렉트하지 않고 화면에서 로그인을 유도한다.
  const user = await getUser();
  const inquiries = user ? await getMyInquiries(user.id) : [];

  return <InquiriesScreen isLoggedIn={Boolean(user)} inquiries={inquiries} />;
}
