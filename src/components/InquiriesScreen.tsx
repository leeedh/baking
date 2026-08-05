'use client';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Link } from '@/i18n/navigation';
import { buttonClasses } from '@/lib/button-classes';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import {
  DEFAULT_INQUIRY_CATEGORY,
  INQUIRY_CATEGORIES,
  inquiryCategoryLabelKey,
} from '@/lib/inquiry-categories';
import { INQUIRY_STATUS } from '@/lib/status-badges';
import type { InquiryRow } from '@/types';
import { CheckCircle2, ChevronDown, Lock, MessageSquarePlus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import FaqAccordion from './sections/FaqAccordion';



interface InquiriesScreenProps {
  /** 비로그인이면 null — 폼 대신 로그인 유도를 보여준다. */
  isLoggedIn: boolean;
  inquiries: InquiryRow[];
}

// DC-97 (PRD-F-21) · 문의사항.
// FAQ 사전 안내 → 1:1 비공개 문의 폼(회원 전용) → 내 문의 목록·답변.
export default function InquiriesScreen({ isLoggedIn, inquiries }: InquiriesScreenProps) {
  const router = useRouter();
  const t = useTranslations('inquiries');
  const locale = useLocale() as 'ko' | 'en';
  const [category, setCategory] = useState<string>(DEFAULT_INQUIRY_CATEGORY);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const idPrefix = useId();

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
        setError(problem?.detail ?? t('errSubmit'));
        return;
      }
      setSubject('');
      setBody('');
      setCategory(DEFAULT_INQUIRY_CATEGORY);
      // 서버에서 목록을 다시 읽어 새 문의를 반영한다.
      router.refresh();
    } catch {
      setError(t('errNetwork'));
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
        <p className="text-xs font-bold text-gold tracking-[0.25em] uppercase">Support</p>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-brown leading-tight">
          {t('title')}
        </h1>
        <p className="text-sm text-brown-medium font-light max-w-2xl mx-auto break-keep">
          {t('subtitle')}
        </p>
      </section>

      {/* 사전 안내 FAQ — 반복 문의를 줄이기 위해 폼보다 위에 둔다 */}
      <FaqAccordion
        title={t('faqTitle')}
        description={t('faqDescription')}
      />

      <section className="pb-20 px-6 sm:px-12 max-w-4xl mx-auto space-y-12">
        {/* 1:1 문의 작성 */}
        <div className="bg-white rounded-3xl border border-brown-light shadow-sm p-8 space-y-6">
          <div className="flex items-start gap-3">
            <MessageSquarePlus className="text-terracotta shrink-0 mt-1" size={22} />
            <div className="space-y-1">
              <h2 className="font-serif text-xl font-bold text-brown">{t('formTitle')}</h2>
              <p className="text-xs text-brown-medium font-light flex items-center gap-1.5">
                <Lock size={12} className="text-gold" />
                {t('privacyNote')}
              </p>
            </div>
          </div>

          {isLoggedIn ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
                <Select
                  label={t('categoryLabel')}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {INQUIRY_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {t(`category.${c.labelKey}`)}
                    </option>
                  ))}
                </Select>

                <Input
                  label={t('subjectLabel')}
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t('subjectPlaceholder')}
                  maxLength={120}
                  required
                />
              </div>

              <Textarea
                label={t('bodyLabel')}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t('bodyPlaceholder')}
                rows={6}
                maxLength={4000}
                required
              />

              {error && (
                <p role="alert" className="text-xs text-terracotta font-semibold">
                  {error}
                </p>
              )}

              <div className="flex justify-end">
                <Button type="submit" loading={submitting}>
                  {submitting ? t('submitting') : t('submit')}
                </Button>
              </div>
            </form>
          ) : (
            <div className="text-center py-8 space-y-4 bg-cream/50 rounded-2xl border border-brown-light">
              <p className="text-xs text-brown-medium font-light">
                {t('loginRequired')}
              </p>
              <Link href="/login" className={buttonClasses()}>
                {t('loginCta')}
              </Link>
            </div>
          )}
        </div>

        {/* 내 문의 목록 */}
        {isLoggedIn && (
          <div className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-brown">{t('listTitle')}</h2>

            {inquiries.length === 0 ? (
              <p className="text-xs text-brown-medium font-light py-8 text-center bg-white rounded-2xl border border-brown-light">
                {t('listEmpty')}
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
                      id={`${idPrefix}-trigger-${inq.id}`}
                      onClick={() => setOpenId(isOpen ? null : inq.id)}
                      aria-expanded={isOpen}
                      aria-controls={`${idPrefix}-panel-${inq.id}`}
                      className="w-full text-left p-5 flex items-center justify-between gap-4 hover:bg-cream/40 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={INQUIRY_STATUS[inq.status].tone}>
                            {t(`status.${inq.status}`)}
                          </Badge>
                          <span className="text-[11px] text-brown-medium">
                            {inquiryCategoryLabelKey(inq.category)
                              ? t(`category.${inquiryCategoryLabelKey(inq.category)}`)
                              : inq.category}
                          </span>
                          <span className="text-[11px] text-brown-medium/80">
                            {formatDate(inq.createdAt, locale)}
                          </span>
                        </div>
                        <p className="font-serif text-sm font-bold text-brown truncate">
                          {inq.subject}
                        </p>
                      </div>
                      <ChevronDown
                        size={18}
                        className={cn(
                          'text-terracotta shrink-0 transition-transform duration-300 ease-out-soft',
                          isOpen && 'rotate-180',
                        )}
                      />
                    </button>

                    {isOpen && (
                      <section
                        id={`${idPrefix}-panel-${inq.id}`}
                        aria-labelledby={`${idPrefix}-trigger-${inq.id}`}
                        className="px-5 pb-5 space-y-4 border-t border-cream animate-fade-in"
                      >
                        <p className="text-xs text-brown-medium leading-relaxed font-light whitespace-pre-wrap pt-4">
                          {inq.body}
                        </p>

                        {inq.answerBody ? (
                          <div className="bg-cream/60 rounded-xl border border-brown-light p-4 space-y-2">
                            <div className="flex items-center gap-1.5 text-terracotta">
                              <CheckCircle2 size={13} />
                              <span className="text-[11px] font-bold uppercase tracking-wider">
                                {t('answerLabel')}
                              </span>
                              {inq.answeredAt && (
                                <span className="text-[11px] text-brown-medium/80 font-normal">
                                  {formatDate(inq.answeredAt, locale)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-brown leading-relaxed font-light whitespace-pre-wrap">
                              {inq.answerBody}
                            </p>
                          </div>
                        ) : (
                          <p className="text-[11px] text-brown-medium/80 font-light">
                            {t('pendingNote')}
                          </p>
                        )}
                      </section>
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
