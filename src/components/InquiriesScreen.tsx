'use client';

import { Link } from '@/i18n/navigation';
import type { InquiryRow } from '@/types';
import { CheckCircle2, ChevronDown, Lock, MessageSquarePlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import FaqAccordion from './sections/FaqAccordion';

const CATEGORIES = ['결제', '수강', '영상', '자료', '기타'] as const;

const STATUS_LABEL: Record<InquiryRow['status'], string> = {
  open: '접수',
  answered: '답변완료',
  closed: '종료',
};

const STATUS_STYLE: Record<InquiryRow['status'], string> = {
  open: 'bg-gold/10 text-gold border-gold/20',
  answered: 'bg-terracotta/10 text-terracotta border-terracotta/20',
  closed: 'bg-brown/8 text-brown-medium border-brown-light',
};

interface InquiriesScreenProps {
  /** 비로그인이면 null — 폼 대신 로그인 유도를 보여준다. */
  isLoggedIn: boolean;
  inquiries: InquiryRow[];
}

// DC-97 (PRD-F-21) · 문의사항.
// FAQ 사전 안내 → 1:1 비공개 문의 폼(회원 전용) → 내 문의 목록·답변.
export default function InquiriesScreen({ isLoggedIn, inquiries }: InquiriesScreenProps) {
  const router = useRouter();
  const [category, setCategory] = useState<string>('기타');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, subject, body }),
      });
      if (!res.ok) {
        const problem = await res.json().catch(() => null);
        setError(problem?.detail ?? '문의를 등록하지 못했습니다.');
        return;
      }
      setSubject('');
      setBody('');
      setCategory('기타');
      // 서버에서 목록을 다시 읽어 새 문의를 반영한다.
      router.refresh();
    } catch {
      setError('네트워크 오류로 문의를 등록하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="inquiries-screen"
      className="bg-ivory min-h-screen text-brown font-sans selection:bg-terracotta/20 selection:text-terracotta"
    >
      <section className="pt-12 pb-4 px-6 sm:px-12 max-w-4xl mx-auto text-center space-y-3">
        <span className="text-xs font-bold text-gold tracking-[0.25em] uppercase">
          Support
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-brown leading-tight">
          문의사항
        </h1>
        <p className="text-sm text-brown-medium font-light max-w-2xl mx-auto break-keep">
          자주 묻는 질문에서 먼저 답을 찾아보세요. 해결되지 않는 내용은 1:1 비공개 문의로
          남겨주시면 운영자가 직접 답변드립니다.
        </p>
      </section>

      {/* 사전 안내 FAQ — 반복 문의를 줄이기 위해 폼보다 위에 둔다 */}
      <FaqAccordion
        title="먼저 확인해보세요"
        description="문의가 가장 많은 항목을 미리 정리했습니다."
      />

      <section className="pb-20 px-6 sm:px-12 max-w-4xl mx-auto space-y-12">
        {/* 1:1 문의 작성 */}
        <div className="bg-white rounded-3xl border border-brown-light shadow-sm p-8 space-y-6">
          <div className="flex items-start gap-3">
            <MessageSquarePlus className="text-terracotta shrink-0 mt-1" size={22} />
            <div className="space-y-1">
              <h2 className="font-serif text-xl font-bold text-brown">1:1 비공개 문의</h2>
              <p className="text-xs text-brown-medium font-light flex items-center gap-1.5">
                <Lock size={12} className="text-gold" />
                작성하신 문의는 본인과 운영자에게만 보입니다.
              </p>
            </div>
          </div>

          {isLoggedIn ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
                <label className="block">
                  <span className="sr-only">문의 분류</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    aria-label="문의 분류"
                    className="w-full px-3 py-2.5 bg-white border border-brown-light rounded-xl text-xs text-brown focus:outline-none focus:ring-1 focus:ring-terracotta"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="제목을 입력해주세요"
                  aria-label="문의 제목"
                  maxLength={120}
                  required
                  className="w-full px-3 py-2.5 bg-white border border-brown-light rounded-xl text-xs text-brown placeholder-brown-medium/50 focus:outline-none focus:ring-1 focus:ring-terracotta"
                />
              </div>

              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="문의 내용을 자세히 적어주시면 더 정확히 안내해드릴 수 있습니다."
                aria-label="문의 내용"
                rows={6}
                maxLength={4000}
                required
                className="w-full px-3 py-2.5 bg-white border border-brown-light rounded-xl text-xs text-brown placeholder-brown-medium/50 leading-relaxed focus:outline-none focus:ring-1 focus:ring-terracotta"
              />

              {error && (
                <p role="alert" className="text-xs text-terracotta font-semibold">
                  {error}
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-brown hover:bg-terracotta disabled:opacity-50 disabled:cursor-not-allowed text-cream text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {submitting ? '등록 중…' : '문의 등록'}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-8 space-y-4 bg-cream/50 rounded-2xl border border-brown-light">
              <p className="text-xs text-brown-medium font-light">
                1:1 문의는 로그인 회원만 작성할 수 있습니다.
              </p>
              <Link
                href="/login"
                className="inline-block px-6 py-3 bg-brown hover:bg-terracotta text-cream text-xs font-bold rounded-xl shadow-md transition-colors"
              >
                로그인하고 문의하기
              </Link>
            </div>
          )}
        </div>

        {/* 내 문의 목록 */}
        {isLoggedIn && (
          <div className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-brown">내 문의 내역</h2>

            {inquiries.length === 0 ? (
              <p className="text-xs text-brown-medium font-light py-8 text-center bg-white rounded-2xl border border-brown-light">
                아직 등록한 문의가 없습니다.
              </p>
            ) : (
              inquiries.map((inq) => {
                const isOpen = openId === inq.id;
                return (
                  <div
                    key={inq.id}
                    className="bg-white rounded-2xl border border-brown-light overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : inq.id)}
                      aria-expanded={isOpen}
                      className="w-full text-left p-5 flex items-center justify-between gap-4 hover:bg-cream/40 transition-colors"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_STYLE[inq.status]}`}
                          >
                            {STATUS_LABEL[inq.status]}
                          </span>
                          <span className="text-[10px] text-brown-medium/70">{inq.category}</span>
                          <span className="text-[10px] text-brown-medium/50">
                            {new Date(inq.createdAt).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        <p className="font-serif text-sm font-bold text-brown truncate">
                          {inq.subject}
                        </p>
                      </div>
                      <ChevronDown
                        size={18}
                        className={`text-terracotta shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 space-y-4 border-t border-cream">
                        <p className="text-xs text-brown-medium leading-relaxed font-light whitespace-pre-wrap pt-4">
                          {inq.body}
                        </p>

                        {inq.answerBody ? (
                          <div className="bg-cream/60 rounded-xl border border-brown-light p-4 space-y-2">
                            <div className="flex items-center gap-1.5 text-terracotta">
                              <CheckCircle2 size={13} />
                              <span className="text-[10px] font-bold uppercase tracking-wider">
                                운영자 답변
                              </span>
                              {inq.answeredAt && (
                                <span className="text-[10px] text-brown-medium/50 font-normal">
                                  {new Date(inq.answeredAt).toLocaleDateString('ko-KR')}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-brown leading-relaxed font-light whitespace-pre-wrap">
                              {inq.answerBody}
                            </p>
                          </div>
                        ) : (
                          <p className="text-[11px] text-brown-medium/60 font-light">
                            운영자가 확인 중입니다. 답변이 등록되면 이 화면에서 확인하실 수 있습니다.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>
    </div>
  );
}
