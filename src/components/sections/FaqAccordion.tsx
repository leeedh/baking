'use client';

import { cn } from '@/lib/cn';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useId, useState } from 'react';

const FAQS = [
  {
    q: '베이킹이 아예 처음인 왕초보인데 전문가용 클래스를 따라갈 수 있을까요?',
    a: '네, Atelier Crème의 클래스는 밀리그램(mg) 단위의 계량부터 반죽의 질감, 실시간 오븐 내부의 팽창 순간까지 하이엔드 접사 카메라로 밀착 촬영되어 제공됩니다. 초보자분들이 가장 많이 하시는 계수 실수와 도구 오염 방지 가이드를 1차시 무료 VOD로 먼저 맛보실 수 있습니다.',
  },
  {
    q: '해외(대만/일본 등) 수강생을 위한 자막이나 글로벌 수강 환경이 지원되나요?',
    a: '네, 모든 VOD 강의는 다국어 전문 번역가의 감수를 거쳐 한국어 자막, 중국어 번역 자막이 오차가 발생하지 않도록 100% 동기화 개발되어 있습니다. 자막 제어 기능을 통해 기기 상관없이 아주 매끄럽게 학습하실 수 있습니다.',
  },
  {
    q: '구매한 클래스의 레시피 북(PDF)이나 원가 분석표 배합표 양식도 주어지나요?',
    a: '물론입니다. 클래스를 소장하시는 즉시, 각 오너 파티시에가 현업 매장과 브랜드 컨설팅 시 사용하는 상업용 비밀 레시피 북 PDF 파일과 재료 단가 산출 전용 엑셀 마스터 템플릿 파일이 수강 자료실에서 평생 기한 없이 제한 없이 다운로드 제공됩니다.',
  },
  {
    q: '구독형 교육 플랫폼과 다른 단건 VOD 평생 소장의 이점은 무엇인가요?',
    a: '매달 주기적으로 자동 결제되어 수백만 원 대의 미수강 부채감을 주는 구독 사이트들과 다르게, 평생 소장은 단 한 번 구매로 가입하신 ID에 수강권이 ‘영구 동기화’됩니다. 원하는 제빵 시즌이나 카페 신메뉴 오픈 주기에 맞춰 5년, 10년 후에도 기한 없이 꺼내 보실 수 있습니다.',
  },
];

interface FaqAccordionProps {
  /** 문의사항 화면(DC-97)에서 사전 안내로 쓸 때 문구를 바꾸기 위한 슬롯. */
  title?: string;
  description?: string;
}

// DC-96 · FAQ 아코디언. 온라인 클래스(/classes) 하단 + 문의사항(/inquiries) 사전 안내에서 재사용.
export default function FaqAccordion({
  title = '자주 묻는 질문 (FAQ)',
  description = 'Atelier Crème VOD 보관함 수강 시작 전 확인해보세요.',
}: FaqAccordionProps) {
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
          {title}
        </h2>
        <p className="text-xs sm:text-sm text-brown-medium font-light break-keep">{description}</p>
      </div>

      <div className="space-y-4">
        {FAQS.map((faq, idx) => {
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
