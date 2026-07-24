'use client';

import { Link } from '@/i18n/navigation';
import type { AdminClassRow, AdminKpi } from '@/types';
import { Coins, Filter, GraduationCap, ListVideo, Plus, Sparkles, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';

type Props = {
  initialKpi: AdminKpi;
  initialClasses: AdminClassRow[];
};

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: string; title?: string };
    return body.detail ?? body.title ?? '요청을 처리하지 못했습니다.';
  } catch {
    return '요청을 처리하지 못했습니다.';
  }
}

export default function DashboardScreen({ initialKpi, initialClasses }: Props) {
  const router = useRouter();
  const kpi = initialKpi;
  const classList = initialClasses;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 단가 인라인 편집
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<number>(0);

  // 새 클래스 등록 모달
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newInstructor, setNewInstructor] = useState('');
  const [newPrice, setNewPrice] = useState<number>(0);

  const startEditPrice = (cls: AdminClassRow) => {
    setError(null);
    setEditingClassId(cls.id);
    setEditingPrice(cls.price);
  };

  const savePriceEdit = async (id: string) => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/courses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceKrw: editingPrice }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(await readError(res));
      return;
    }
    setEditingClassId(null);
    router.refresh();
  };

  const toggleStatus = async (cls: AdminClassRow) => {
    setBusy(true);
    setError(null);
    const next = cls.status === 'published' ? 'draft' : 'published';
    const res = await fetch(`/api/admin/courses/${cls.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(await readError(res));
      return;
    }
    router.refresh();
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newPrice) {
      setError('강의 명칭과 가격을 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch('/api/admin/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titleKo: newTitle,
        instructorTitleKo: newInstructor,
        priceKrw: Number(newPrice),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(await readError(res));
      return;
    }
    setShowAddModal(false);
    setNewTitle('');
    setNewInstructor('');
    setNewPrice(0);
    router.refresh();
  };

  return (
    <div id="dashboard-screen" className="bg-[#FAF4EA] py-10 px-4 sm:px-8 max-w-7xl mx-auto">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <span className="text-xs font-bold text-[#B0863C] tracking-wider uppercase block">
            ADMIN SYSTEM
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#2A211B] flex items-center gap-2">
            운영자 모드 대시보드
            <span className="text-xs font-sans text-[#B65538] bg-[#B65538]/10 px-2 py-0.5 rounded font-bold">
              LIVE
            </span>
          </h1>
          <p className="text-xs text-[#5F4E43] mt-1">
            결제 완료(paid) 주문과 유효(active) 수강권 기준 실집계입니다.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#B65538] hover:bg-[#A14328] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
          >
            <Plus size={14} /> 새 클래스 등록
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-[#B65538]/30 bg-[#B65538]/10 px-4 py-3 text-xs font-semibold text-[#A14328]"
        >
          {error}
        </div>
      )}

      {/* KPI METRICS (매출 · 수강생 · 완주율) */}
      <div id="kpi-grid" className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-xl border border-[#EFE8DC] p-5 space-y-3 shadow-sm">
          <div className="flex justify-between items-center text-[#5F4E43]">
            <span className="text-xs font-bold uppercase tracking-wider">유효 매출 (누적)</span>
            <span className="text-[#B65538] p-1.5 bg-[#B65538]/10 rounded-lg">
              <Coins size={16} />
            </span>
          </div>
          <span className="text-2xl font-serif font-extrabold text-[#2A211B]">
            ₩{kpi.salesTotal.toLocaleString()}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-[#EFE8DC] p-5 space-y-3 shadow-sm">
          <div className="flex justify-between items-center text-[#5F4E43]">
            <span className="text-xs font-bold uppercase tracking-wider">누적 수강생</span>
            <span className="text-[#B0863C] p-1.5 bg-[#B0863C]/10 rounded-lg">
              <Users size={16} />
            </span>
          </div>
          <span className="text-2xl font-serif font-extrabold text-[#2A211B]">
            {kpi.studentsTotal.toLocaleString()} 명
          </span>
        </div>

        <div className="bg-white rounded-xl border border-[#EFE8DC] p-5 space-y-3 shadow-sm">
          <div className="flex justify-between items-center text-[#5F4E43]">
            <span className="text-xs font-bold uppercase tracking-wider">평균 수강 완주율</span>
            <span className="text-emerald-700 p-1.5 bg-emerald-50 rounded-lg">
              <GraduationCap size={16} />
            </span>
          </div>
          <span className="text-2xl font-serif font-extrabold text-[#2A211B]">
            {kpi.completionRate.toFixed(1)} %
          </span>
        </div>
      </div>

      {/* CLASSES MANAGEMENT TABLE */}
      <div className="bg-white rounded-2xl border border-[#EFE8DC] shadow-sm overflow-hidden">
        <div className="p-6 bg-[#FAF4EA]/40 border-b border-[#EFE8DC] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-serif text-base font-bold text-[#2A211B]">클래스 판매 실적 관리</h3>
            <p className="text-[11px] text-[#5F4E43] mt-0.5">
              단가 조정·게시 상태 전환이 실시간으로 반영됩니다.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#5F4E43] flex items-center gap-1">
            <Filter size={13} /> 정렬: 높은 매출 순
          </span>
        </div>

        {classList.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#5F4E43]">
            아직 등록된 클래스가 없습니다. “새 클래스 등록”으로 시작하세요.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              id="tbl-baking-classes"
              className="w-full text-left border-collapse min-w-[720px]"
            >
              <thead>
                <tr className="bg-[#FAF4EA]/20 border-b border-[#EFE8DC] text-[11px] font-bold text-[#5F4E43] uppercase tracking-wider">
                  <th className="py-4 px-6">강의명</th>
                  <th className="py-4 px-6">상태</th>
                  <th className="py-4 px-6 text-right">정가</th>
                  <th className="py-4 px-6 text-right">판매 수량</th>
                  <th className="py-4 px-6 text-right">정산 매출</th>
                  <th className="py-4 px-6 text-center">완주율</th>
                  <th className="py-4 px-6 text-right">운영</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE8DC]/60 text-xs sm:text-sm text-[#2A211B]">
                {classList.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAF4EA]/10 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-bold text-xs block truncate max-w-[250px]">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-[#5F4E43]/60 block mt-1 font-mono">
                        {item.id.slice(0, 8)}…
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          item.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-[#5F4E43]/10 text-[#5F4E43]'
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
                            className="w-24 px-1 py-0.5 border border-[#B65538] text-xs font-bold rounded"
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

                    <td className="py-4 px-6 text-right font-mono text-[#5F4E43]">
                      {item.salesCount.toLocaleString()}
                    </td>

                    <td className="py-4 px-6 text-right font-mono font-bold text-[#B0863C]">
                      ₩{item.revenue.toLocaleString()}
                    </td>

                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-emerald-700">
                          {item.completionRate.toFixed(1)}%
                        </span>
                        <div className="w-16 bg-[#FAF4EA] h-1.5 rounded-full overflow-hidden mt-1 border border-[#EFE8DC]">
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
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#B0863C] bg-[#B0863C]/10 hover:bg-[#B0863C] hover:text-[#FAF4EA] rounded transition-all cursor-pointer align-middle"
                      >
                        <ListVideo size={12} /> 차시
                      </Link>
                      {editingClassId !== item.id && (
                        <button
                          type="button"
                          onClick={() => startEditPrice(item)}
                          className="px-2.5 py-1 text-[11px] font-bold text-[#B65538] bg-[#B65538]/10 hover:bg-[#B65538] hover:text-[#FAF4EA] rounded transition-all cursor-pointer"
                        >
                          단가 조정
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => toggleStatus(item)}
                        className="px-2.5 py-1 text-[11px] font-bold text-[#5F4E43] bg-[#5F4E43]/10 hover:bg-[#5F4E43] hover:text-[#FAF4EA] rounded transition-all cursor-pointer disabled:opacity-50"
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

      {/* ADD CLASS MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#EFE8DC] p-6 space-y-4 shadow-2xl relative">
            <div className="border-b border-[#FAF4EA] pb-2">
              <h3 className="font-serif text-lg font-bold text-[#2A211B] flex items-center gap-1">
                <Sparkles size={18} className="text-[#B0863C]" /> 새 클래스 등록
              </h3>
              <p className="text-[10px] text-[#5F4E43] mt-0.5">
                초안(draft)으로 생성됩니다. 차시 구성 후 “게시”하면 카탈로그에 노출됩니다.
              </p>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[#5F4E43] uppercase mb-1">
                  강의 명칭 (한국어)
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EFE8DC] rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#B65538] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#5F4E43] uppercase mb-1">
                  강사 직함 (선택)
                </label>
                <input
                  type="text"
                  value={newInstructor}
                  onChange={(e) => setNewInstructor(e.target.value)}
                  className="w-full px-3 py-2 border border-[#EFE8DC] rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#B65538] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#5F4E43] uppercase mb-1">
                  판매가 (KRW ₩)
                </label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  min={0}
                  className="w-full px-3 py-2 border border-[#EFE8DC] rounded-lg text-xs font-mono font-medium focus:ring-1 focus:ring-[#B65538] focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-[#FAF4EA] border border-[#EFE8DC] text-xs font-semibold rounded-lg text-[#5F4E43] hover:bg-[#FAF4EA]/80 transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 py-2 bg-[#B65538] text-white text-xs font-bold rounded-lg hover:bg-[#A14328] transition-colors cursor-pointer disabled:opacity-50"
                >
                  등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
