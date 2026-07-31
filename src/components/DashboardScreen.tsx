'use client';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import { Link } from '@/i18n/navigation';
import { readError } from '@/lib/api/read-error';
import { ADMIN_INQUIRY_STATUS, ORDER_STATUS } from '@/lib/status-badges';
import type { AdminClassRow, AdminKpi, AdminOrderRow, InquiryRow } from '@/types';
import {
  Coins,
  Filter,
  GraduationCap,
  ListVideo,
  MessagesSquare,
  Plus,
  Receipt,
  RotateCcw,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';

type Props = {
  initialKpi: AdminKpi;
  initialClasses: AdminClassRow[];
  initialOrders: AdminOrderRow[];
  /** DC-97 · 운영자 문의 큐(미답변 우선). */
  initialInquiries: InquiryRow[];
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DashboardScreen({
  initialKpi,
  initialClasses,
  initialOrders,
  initialInquiries,
}: Props) {
  const router = useRouter();
  const kpi = initialKpi;
  const classList = initialClasses;
  const orderList = initialOrders;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // DC-97 문의 답변
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerDraft, setAnswerDraft] = useState('');

  // 환불 확인 모달
  const [refundTarget, setRefundTarget] = useState<AdminOrderRow | null>(null);
  const [refundReason, setRefundReason] = useState('');

  // 단가 인라인 편집
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<number>(0);

  // 새 클래스 등록 모달
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newInstructor, setNewInstructor] = useState('');
  const [newPrice, setNewPrice] = useState<number>(0);

  /**
   * 운영 액션 공통 실행기 — fetch가 throw해도 finally에서 busy를 반드시 푼다.
   * 예전에는 액션마다 setBusy(false)를 수동으로 불러서, 네트워크 예외가 나면
   * 화면이 "처리 중"으로 고착돼 다음 작업을 못 했다(코드리뷰 X-3).
   */
  const runMutation = async (request: () => Promise<Response>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      const res = await request();
      if (!res.ok) {
        setError(await readError(res));
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError('요청을 처리하지 못했습니다. 네트워크 상태를 확인해 주세요.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  /** TS-API-15 · 답변 등록·상태 전이. 성공 시 서버 데이터를 다시 읽어 목록을 갱신한다. */
  const patchInquiry = (id: string, patch: { answerBody?: string; status?: string }) =>
    runMutation(() =>
      fetch(`/api/admin/inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }),
    );

  const submitAnswer = async (id: string) => {
    const ok = await patchInquiry(id, { answerBody: answerDraft.trim() });
    if (ok) {
      setAnsweringId(null);
      setAnswerDraft('');
    }
  };

  const startEditPrice = (cls: AdminClassRow) => {
    setError(null);
    setEditingClassId(cls.id);
    setEditingPrice(cls.price);
  };

  const savePriceEdit = async (id: string) => {
    const ok = await runMutation(() =>
      fetch(`/api/admin/courses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceKrw: editingPrice }),
      }),
    );
    if (ok) setEditingClassId(null);
  };

  const toggleStatus = async (cls: AdminClassRow) => {
    const next = cls.status === 'published' ? 'draft' : 'published';
    await runMutation(() =>
      fetch(`/api/admin/courses/${cls.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      }),
    );
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newPrice) {
      setError('강의 명칭과 가격을 입력해 주세요.');
      return;
    }
    const ok = await runMutation(() =>
      fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleKo: newTitle,
          instructorTitleKo: newInstructor,
          priceKrw: Number(newPrice),
        }),
      }),
    );
    if (!ok) return;
    setShowAddModal(false);
    setNewTitle('');
    setNewInstructor('');
    setNewPrice(0);
  };

  const openRefund = (order: AdminOrderRow) => {
    setError(null);
    setRefundReason('');
    setRefundTarget(order);
  };

  const handleRefund = async () => {
    if (!refundTarget) return;
    const ok = await runMutation(() =>
      fetch(`/api/admin/orders/${refundTarget.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refundReason.trim() || undefined }),
      }),
    );
    if (!ok) return;
    setRefundTarget(null);
  };

  return (
    <div id="dashboard-screen" className="bg-cream py-10 px-4 sm:px-8 max-w-7xl mx-auto">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <span className="text-xs font-bold text-gold tracking-wider uppercase block">
            ADMIN SYSTEM
          </span>
          <h1 className="font-serif text-3xl font-bold text-brown flex items-center gap-2">
            운영자 모드 대시보드
            <span className="text-xs font-sans text-terracotta bg-terracotta/10 px-2 py-0.5 rounded font-bold">
              LIVE
            </span>
          </h1>
          <p className="text-xs text-brown-medium mt-1">
            결제 완료(paid) 주문과 유효(active) 수강권 기준 실집계입니다.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-terracotta hover:bg-terracotta-deep text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
          >
            <Plus size={14} /> 새 클래스 등록
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-xs font-semibold text-terracotta-deep"
        >
          {error}
        </div>
      )}

      {/* KPI METRICS (매출 · 수강생 · 완주율) */}
      <div id="kpi-grid" className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-xl border border-brown-light p-5 space-y-3 shadow-sm">
          <div className="flex justify-between items-center text-brown-medium">
            <span className="text-xs font-bold uppercase tracking-wider">유효 매출 (누적)</span>
            <span className="text-terracotta p-1.5 bg-terracotta/10 rounded-lg">
              <Coins size={16} />
            </span>
          </div>
          <span className="text-2xl font-serif font-extrabold text-brown">
            ₩{kpi.salesTotal.toLocaleString()}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-brown-light p-5 space-y-3 shadow-sm">
          <div className="flex justify-between items-center text-brown-medium">
            <span className="text-xs font-bold uppercase tracking-wider">누적 수강생</span>
            <span className="text-gold p-1.5 bg-gold/10 rounded-lg">
              <Users size={16} />
            </span>
          </div>
          <span className="text-2xl font-serif font-extrabold text-brown">
            {kpi.studentsTotal.toLocaleString()} 명
          </span>
        </div>

        <div className="bg-white rounded-xl border border-brown-light p-5 space-y-3 shadow-sm">
          <div className="flex justify-between items-center text-brown-medium">
            <span className="text-xs font-bold uppercase tracking-wider">평균 수강 완주율</span>
            <span className="text-emerald-700 p-1.5 bg-emerald-50 rounded-lg">
              <GraduationCap size={16} />
            </span>
          </div>
          <span className="text-2xl font-serif font-extrabold text-brown">
            {kpi.completionRate.toFixed(1)} %
          </span>
        </div>
      </div>

      {/* CLASSES MANAGEMENT TABLE */}
      <div className="bg-white rounded-2xl border border-brown-light shadow-sm overflow-hidden">
        <div className="p-6 bg-cream/40 border-b border-brown-light flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-serif text-base font-bold text-brown">클래스 판매 실적 관리</h3>
            <p className="text-[11px] text-brown-medium mt-0.5">
              단가 조정·게시 상태 전환이 실시간으로 반영됩니다.
            </p>
          </div>
          <span className="text-xs font-semibold text-brown-medium flex items-center gap-1">
            <Filter size={13} /> 정렬: 높은 매출 순
          </span>
        </div>

        {classList.length === 0 ? (
          <div className="py-16 text-center text-sm text-brown-medium">
            아직 등록된 클래스가 없습니다. “새 클래스 등록”으로 시작하세요.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              id="tbl-baking-classes"
              className="w-full text-left border-collapse min-w-[720px]"
            >
              <thead>
                <tr className="bg-cream/20 border-b border-brown-light text-[11px] font-bold text-brown-medium uppercase tracking-wider">
                  <th className="py-4 px-6">강의명</th>
                  <th className="py-4 px-6">상태</th>
                  <th className="py-4 px-6 text-right">정가</th>
                  <th className="py-4 px-6 text-right">판매 수량</th>
                  <th className="py-4 px-6 text-right">정산 매출</th>
                  <th className="py-4 px-6 text-center">완주율</th>
                  <th className="py-4 px-6 text-right">운영</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brown-light/60 text-xs sm:text-sm text-brown">
                {classList.map((item) => (
                  <tr key={item.id} className="hover:bg-cream/10 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-bold text-xs block truncate max-w-[250px]">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-brown-medium/60 block mt-1 font-mono">
                        {item.id.slice(0, 8)}…
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          item.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-brown-medium/10 text-brown-medium'
                        }`}
                      >
                        {item.status === 'published' ? '게시됨' : '초안'}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right font-mono font-medium">
                      {editingClassId === item.id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            type="number"
                            value={editingPrice}
                            onChange={(e) => setEditingPrice(Number(e.target.value))}
                            className="w-24 px-1 py-0.5 border border-terracotta text-xs font-bold rounded"
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => savePriceEdit(item.id)}
                            className="px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] rounded disabled:opacity-50"
                          >
                            저장
                          </button>
                        </div>
                      ) : (
                        <span>₩{item.price.toLocaleString()}</span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-right font-mono text-brown-medium">
                      {item.salesCount.toLocaleString()}
                    </td>

                    <td className="py-4 px-6 text-right font-mono font-bold text-gold">
                      ₩{item.revenue.toLocaleString()}
                    </td>

                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-emerald-700">
                          {item.completionRate.toFixed(1)}%
                        </span>
                        <div className="w-16 bg-cream h-1.5 rounded-full overflow-hidden mt-1 border border-brown-light">
                          <div
                            className="bg-emerald-600 h-full rounded-full"
                            style={{ width: `${Math.min(item.completionRate, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6 text-right whitespace-nowrap space-x-1.5">
                      <Link
                        href={`/admin/courses/${item.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-gold bg-gold/10 hover:bg-gold hover:text-cream rounded transition-all cursor-pointer align-middle"
                      >
                        <ListVideo size={12} /> 차시
                      </Link>
                      {editingClassId !== item.id && (
                        <button
                          type="button"
                          onClick={() => startEditPrice(item)}
                          className="px-2.5 py-1 text-[11px] font-bold text-terracotta bg-terracotta/10 hover:bg-terracotta hover:text-cream rounded transition-all cursor-pointer"
                        >
                          단가 조정
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => toggleStatus(item)}
                        className="px-2.5 py-1 text-[11px] font-bold text-brown-medium bg-brown-medium/10 hover:bg-brown-medium hover:text-cream rounded transition-all cursor-pointer disabled:opacity-50"
                      >
                        {item.status === 'published' ? '비공개' : '게시'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ORDERS · REFUND TABLE (DC-34) */}
      <div className="mt-10 bg-white rounded-2xl border border-brown-light shadow-sm overflow-hidden">
        <div className="p-6 bg-cream/40 border-b border-brown-light flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-serif text-base font-bold text-brown flex items-center gap-1.5">
              <Receipt size={16} className="text-terracotta" /> 주문 · 환불 관리
            </h3>
            <p className="text-[11px] text-brown-medium mt-0.5">
              환불 시 결제가 취소되고 수강권이 즉시 회수됩니다(이력은 보존).
            </p>
          </div>
          <span className="text-xs font-semibold text-brown-medium flex items-center gap-1">
            <Filter size={13} /> 최근 주문 순
          </span>
        </div>

        {orderList.length === 0 ? (
          <div className="py-16 text-center text-sm text-brown-medium">주문 내역이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-cream/20 border-b border-brown-light text-[11px] font-bold text-brown-medium uppercase tracking-wider">
                  <th className="py-4 px-6">주문 / 구매자</th>
                  <th className="py-4 px-6">클래스</th>
                  <th className="py-4 px-6 text-right">결제액</th>
                  <th className="py-4 px-6">상태</th>
                  <th className="py-4 px-6">결제일시</th>
                  <th className="py-4 px-6 text-right">운영</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brown-light/60 text-xs sm:text-sm text-brown">
                {orderList.map((order) => (
                  <tr key={order.id} className="hover:bg-cream/10 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-bold text-xs block truncate max-w-[180px]">
                        {order.buyer}
                      </span>
                      <span className="text-[10px] text-brown-medium/60 block mt-1 font-mono">
                        {order.id.slice(0, 8)}…
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-xs block truncate max-w-[220px]">
                        {order.courseTitle}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-medium">
                      ₩{order.amount.toLocaleString()}
                    </td>
                    <td className="py-4 px-6">
                      <Badge tone={ORDER_STATUS[order.status].tone}>
                        {ORDER_STATUS[order.status].text}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-[11px] text-brown-medium whitespace-nowrap">
                      {formatDate(order.paidAt)}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      {order.status === 'paid' ? (
                        <button
                          type="button"
                          onClick={() => openRefund(order)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-terracotta bg-terracotta/10 hover:bg-terracotta hover:text-cream rounded transition-all cursor-pointer"
                        >
                          <RotateCcw size={12} /> 환불
                        </button>
                      ) : (
                        <span className="text-[10px] text-brown-medium/50">
                          {order.status === 'refunded' ? formatDate(order.canceledAt) : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INQUIRIES · 답변 관리 (DC-97 · PRD-F-21) */}
      <div className="mt-10 bg-white rounded-2xl border border-brown-light shadow-sm overflow-hidden">
        <div className="p-6 bg-cream/40 border-b border-brown-light flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-serif text-base font-bold text-brown flex items-center gap-1.5">
              <MessagesSquare size={16} className="text-terracotta" /> 문의 · 답변 관리
            </h3>
            <p className="text-[11px] text-brown-medium mt-0.5">
              1:1 비공개 문의입니다. 답변을 등록하면 작성자만 자신의 문의 상세에서 확인합니다.
            </p>
          </div>
          <span className="text-xs font-semibold text-brown-medium flex items-center gap-1">
            <Filter size={13} /> 미답변 우선
          </span>
        </div>

        {initialInquiries.length === 0 ? (
          <div className="py-16 text-center text-sm text-brown-medium">문의 내역이 없습니다.</div>
        ) : (
          <ul className="divide-y divide-brown-light">
            {initialInquiries.map((inq) => (
              <li key={inq.id} className="p-6 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={ADMIN_INQUIRY_STATUS[inq.status].tone}>
                    {ADMIN_INQUIRY_STATUS[inq.status].text}
                  </Badge>
                  <span className="text-[11px] text-brown-medium">{inq.category}</span>
                  <span className="text-[11px] text-brown-medium/80">{inq.authorLabel}</span>
                  <span className="text-[11px] text-brown-medium/80">
                    {formatDate(inq.createdAt)}
                  </span>
                </div>

                <p className="font-serif text-sm font-bold text-brown">{inq.subject}</p>
                <p className="text-xs text-brown-medium font-light leading-relaxed whitespace-pre-wrap">
                  {inq.body}
                </p>

                {inq.answerBody && answeringId !== inq.id && (
                  <div className="bg-cream/60 rounded-xl border border-brown-light p-3">
                    <span className="text-[10px] font-bold text-terracotta uppercase tracking-wider">
                      등록된 답변
                    </span>
                    <p className="text-xs text-brown font-light leading-relaxed whitespace-pre-wrap mt-1">
                      {inq.answerBody}
                    </p>
                  </div>
                )}

                {answeringId === inq.id ? (
                  <div className="space-y-2">
                    <Textarea
                      label="답변 내용"
                      hideLabel
                      value={answerDraft}
                      onChange={(e) => setAnswerDraft(e.target.value)}
                      rows={4}
                      maxLength={4000}
                      placeholder="답변 내용을 입력하세요"
                    />
                    <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                      <Button variant="outline" size="sm" onClick={() => setAnsweringId(null)}>
                        취소
                      </Button>
                      <Button
                        size="sm"
                        disabled={answerDraft.trim().length === 0}
                        loading={busy}
                        onClick={() => submitAnswer(inq.id)}
                      >
                        답변 등록
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setError(null);
                        setAnsweringId(inq.id);
                        setAnswerDraft(inq.answerBody ?? '');
                      }}
                    >
                      {inq.answerBody ? '답변 수정' : '답변 등록'}
                    </Button>
                    {inq.status !== 'closed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => patchInquiry(inq.id, { status: 'closed' })}
                      >
                        종료 처리
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* REFUND CONFIRM MODAL */}
      <Modal
        open={refundTarget !== null}
        onClose={() => setRefundTarget(null)}
        title="환불 실행"
        description="결제가 취소되고 수강권이 회수됩니다. 되돌릴 수 없습니다."
        className="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setRefundTarget(null)} disabled={busy}>
              취소
            </Button>
            <Button variant="secondary" onClick={handleRefund} loading={busy}>
              {busy ? '처리 중…' : '환불 확정'}
            </Button>
          </>
        }
      >
        {refundTarget && (
          <>
            <dl className="text-xs space-y-1.5 bg-cream/40 rounded-lg p-3">
              <div className="flex justify-between gap-3">
                <dt className="text-brown-medium">구매자</dt>
                <dd className="font-semibold truncate">{refundTarget.buyer}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-brown-medium">클래스</dt>
                <dd className="font-semibold truncate max-w-[220px]">{refundTarget.courseTitle}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-brown-medium">환불액</dt>
                <dd className="font-mono font-bold text-terracotta">
                  ₩{refundTarget.amount.toLocaleString()}
                </dd>
              </div>
            </dl>

            <Input
              label="환불 사유 (선택)"
              type="text"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              maxLength={200}
              placeholder="예: 고객 요청"
            />
          </>
        )}
      </Modal>

      {/* ADD CLASS MODAL */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="새 클래스 등록"
        description="초안(draft)으로 생성됩니다. 차시 구성 후 “게시”하면 카탈로그에 노출됩니다."
        className="max-w-md"
      >
        <form onSubmit={handleCreateClass} className="space-y-3.5">
          <Input
            label="강의 명칭 (한국어)"
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
          />
          <Input
            label="강사 직함 (선택)"
            type="text"
            value={newInstructor}
            onChange={(e) => setNewInstructor(e.target.value)}
          />
          <Input
            label="판매가 (KRW ₩)"
            type="number"
            value={newPrice}
            onChange={(e) => setNewPrice(Number(e.target.value))}
            min={0}
            className="font-mono"
            required
          />

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={busy}>
              취소
            </Button>
            <Button type="submit" variant="secondary" loading={busy}>
              등록
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
