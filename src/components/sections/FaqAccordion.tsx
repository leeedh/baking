'use client';

import { cn } from '@/lib/cn';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

type Faq = { q: string; a: string };

interface FaqAccordionProps {
  /** 문의사항 화면(DC-97)에서 사전 안내로 쓸 때 문구를 바꾸기 위한 슬롯. */
  title?: string;
  description?: string;
}

// DC-96 · FAQ 아코디언. 온라인 클래스(/classes) 하단 + 문의사항(/inquiries) 사전 안내에서 재사용.
export default function FaqAccordion({ title, description }: FaqAccordionProps) {
  const t = useTranslations('sections.faq');
  const faqs = t.raw('items') as Faq[];
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  // 이 컴포넌트는 /classes와 /inquiries 양쪽에서 쓰이므로 id가 겹치지 않게 접두어를 발급한다.
  const idPrefix = useId();

  return (
    <section
      aria-labelledby={`${idPrefix}-heading`}
      className="py-20 px-6 sm:px-12 max-w-4xl mx-auto"
    >
      <div className="text-center space-y-3 mb-12">
        <HelpCircle className="mx-auto text-terracotta" size={28} aria-hidden />
        <h2
          id={`${idPrefix}-heading`}
          className="font-serif text-3xl font-bold text-brown break-keep"
        >
          {title ?? t('title')}
        </h2>
        <p className="text-xs sm:text-sm text-brown-medium font-light break-keep">{description ?? t('description')}</p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => {
          const isOpen = openFaqIndex === idx;
          const panelId = `${idPrefix}-panel-${idx}`;
          const triggerId = `${idPrefix}-trigger-${idx}`;
          return (
            <div
              key={faq.q}
              className="bg-white rounded-2xl border border-brown-light overflow-hidden transition-[border-color] duration-300 has-[button:hover]:border-terracotta/30"
            >
              <button
                type="button"
                id={triggerId}
                onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="w-full text-left p-6 flex justify-between items-center gap-4 bg-white hover:bg-cream/40 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="font-serif text-sm sm:text-base font-bold text-brown break-keep">
                  {faq.q}
                </span>
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
                  id={panelId}
                  aria-labelledby={triggerId}
                  className="px-6 pb-6 pt-4 text-xs sm:text-[13px] text-brown-medium leading-relaxed font-light border-t border-cream bg-cream/20 break-keep animate-fade-in"
                >
                  {faq.a}
                </section>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
