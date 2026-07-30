import type { BadgeTone } from '@/components/ui/Badge';
import type { AdminOrderRow, InquiryRow } from '@/types';

/**
 * 주문·문의 상태의 한국어 라벨과 배지 톤. 예전에는 DashboardScreen에 두 벌,
 * InquiriesScreen에 한 벌이 따로 있어 같은 상태가 화면마다 다른 색으로 보였다.
 * TODO(DC-10): 라벨 문구는 메시지 카탈로그로 이전한다.
 */
export const ORDER_STATUS: Record<AdminOrderRow['status'], { text: string; tone: BadgeTone }> = {
  paid: { text: '결제완료', tone: 'success' },
  refunded: { text: '환불됨', tone: 'terracotta' },
  canceled: { text: '취소됨', tone: 'muted' },
  pending: { text: '대기', tone: 'gold' },
  failed: { text: '실패', tone: 'muted' },
};

/** 수강생 화면(문의사항)에서 쓰는 라벨 — 접수/답변완료/종료. */
export const INQUIRY_STATUS: Record<InquiryRow['status'], { text: string; tone: BadgeTone }> = {
  open: { text: '접수', tone: 'gold' },
  answered: { text: '답변완료', tone: 'terracotta' },
  closed: { text: '종료', tone: 'muted' },
};

/** 운영자 큐에서는 미답변 건을 눈에 띄게 해야 하므로 open 라벨만 다르다. */
export const ADMIN_INQUIRY_STATUS: Record<InquiryRow['status'], { text: string; tone: BadgeTone }> =
  {
    ...INQUIRY_STATUS,
    open: { text: '미답변', tone: 'gold' },
  };
