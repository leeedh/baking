import 'server-only';

import { unwrap } from '@/lib/supabase/query';
import { createClient } from '@/lib/supabase/server';
import type { InquiryRow } from '@/types';

// DC-97 (PRD-F-21) · 문의 조회는 라우트 없이 RSC에서 쿠키 클라이언트로 직접 읽는다(TS-API-07).
// RLS `inquiries_select_own`이 "작성자 본인 OR 운영자"로 행을 가른다 — 운영자 큐
// (getAdminInquiries)는 그 위임에 그대로 기대고 앱에서 필터를 중복하지 않는다.
// 본인 목록(getMyInquiries)만 명시적으로 user_id를 건다: 운영자가 이 함수를 호출해도
// "내 문의"를 뜻해야 하기 때문이다(용도가 다른 두 함수로 분리해 둔 이유).

const COLUMNS = 'id, category, subject, body, status, answer_body, answered_at, created_at';

type Row = {
  id: string;
  category: string;
  subject: string;
  body: string;
  status: 'open' | 'answered' | 'closed';
  answer_body: string | null;
  answered_at: string | null;
  created_at: string;
};

function toInquiry(row: Row, authorLabel: string | null = null): InquiryRow {
  return {
    id: row.id,
    category: row.category,
    subject: row.subject,
    body: row.body,
    status: row.status,
    answerBody: row.answer_body,
    answeredAt: row.answered_at,
    createdAt: row.created_at,
    authorLabel,
  };
}

/** 로그인 사용자 본인의 문의 목록(최신순). RLS가 소유 행만 돌려준다. */
export async function getMyInquiries(userId: string): Promise<InquiryRow[]> {
  const supabase = await createClient();
  const data = unwrap(
    await supabase
      .from('inquiries')
      .select(COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    '내 문의',
  );
  return ((data ?? []) as Row[]).map((row) => toInquiry(row));
}

/**
 * 운영자 문의 큐 — 미답변(open)이 먼저, 그 안에서 최신순.
 * 호출부(admin/page.tsx)가 role 가드를 거치고, RLS의 is_admin()이 이중 방어한다.
 */
export async function getAdminInquiries(): Promise<InquiryRow[]> {
  const supabase = await createClient();
  const data = unwrap(
    await supabase
      .from('inquiries')
      .select(`${COLUMNS}, profiles!inquiries_user_id_fkey(display_name)`)
      .order('created_at', { ascending: false }),
    '문의 목록',
  );

  const rows = (data ?? []) as (Row & { profiles: { display_name: string | null } | null })[];
  const statusRank = { open: 0, answered: 1, closed: 2 } as const;

  return rows
    .map((row) => toInquiry(row, row.profiles?.display_name ?? '수강생'))
    .sort((a, b) => statusRank[a.status] - statusRank[b.status]);
}
