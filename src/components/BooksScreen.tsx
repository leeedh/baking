'use client';

import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  Download,
  Heart,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  Star,
} from 'lucide-react';
import React, { useState } from 'react';

interface BookItem {
  id: string;
  title: string;
  subTitle: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  thumbnail: string;
  edition: string;
  pages: number;
  chapters: string[];
  description: string;
  benefits: string[];
  pdfSpecInfo: string;
}

export default function BooksScreen() {
  const books: BookItem[] = [
    {
      id: 'book-secret-recipes',
      title: '아틀리에 크렘 시그니처 구움과자 마스터 북',
      subTitle: '한남동 품절 대란의 주역, 고도로 축조된 1% 비밀 배합비의 과학',
      price: 32000,
      originalPrice: 45000,
      discountPercent: 28,
      thumbnail:
        'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600', // Vertical book-looking orientation
      edition: '2026 초판 개정 마스터판 (eBook 및 실물 배송 선택 가능)',
      pages: 284,
      chapters: [
        'Chapter 1: 구움과자용 원자재의 분자 요리학적 접근 법',
        'Chapter 2: 오븐 내부 습도 및 열대류 순환 주기 완벽 해석',
        'Chapter 3: 시그니처 탄 버터 휘낭시에 실전 대량 생산 배합 레시피 8종',
        'Chapter 4: 피스타치오 가나슈 무화과 마들렌 테라코타 제빵공법',
        'Chapter 5: 자영업 오너를 위한 원가 자동 계산 엑셀 시트 연동법 & 마진 세팅',
      ],
      description:
        '단순히 ‘밀가루와 계란을 섞어 굽는다’식의 기초 설명서를 거부합니다. 밀가루 속 전분의 호화가 일어나는 임계 온도, 가나슈 필링이 꼬끄 속에서 수분을 흡수하기 가장 좋은 유성 비율 등, 10년 노하우를 시각적 차트와 수학 공식으로 낱낱이 도해해 낸 국내 유일한 프로용 제과 에디토리얼 가이드북입니다.',
      benefits: [
        '소장 즉시 1:1 상담 질문 게시판 무제한 이용권',
        '전체 제품 상업 배합 비율 마스터용 오토 엑셀 캘큘레이터 다운로드',
        '한컴/PDF 포맷 모바일/PC 프리미엄 전용 리더 지원',
      ],
      pdfSpecInfo:
        '구매 즉시 내 강의실 자료판 및 가입 이메일로 암호화 PDF 배송 및 영구 다운로드 제공',
    },
    {
      id: 'book-french-bible',
      title: '피에르 마카롱 & 정통 프렌치 파티세리 바이블',
      subTitle: '르 꼬르동 블루 그랑 디플로마의 기술과 현장 공정 전수서',
      price: 38000,
      originalPrice: 50000,
      discountPercent: 24,
      thumbnail:
        'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=600',
      edition: '2026 에디션 3쇄 인쇄본',
      pages: 310,
      chapters: [
        'Chapter 1: 프렌치 머랭 vs 이탈리안 머랭의 점성 한계치 실험',
        'Chapter 2: 피에(Foot)의 높이를 일정하게 뿜어내는 마카로나쥬 압력 그래프',
        'Chapter 3: 계절 과일을 활용한 기온 및 습도 연동형 가나슈 시크릿 빌드',
        'Chapter 4: 파트 사블레 폰사주 기조 및 고정 구도 앵글 프레임',
        'Chapter 5: 바닐라 크레뫼 무슬린 크림의 유지방 분리 제어 극복',
      ],
      description:
        '온라인 가이드 영상만으로는 아쉬웠던 프랑스 클래식 제과의 핵심 골격을 담았습니다. 머랭의 밀도가 꼬끄의 빳빳함과 겉 식감에 어떤 영향을 끼치는지, 실제 믹싱 기어 수치와 접사 사진으로 상세히 담았습니다. Sugar Lane식 계량 정교화와 Happy Happy Academy식의 탁월한 비주얼 철학이 만난 도서입니다.',
      benefits: [
        '프랑스 현지 유기농 밀가루 3선 단독 바잉 가이드 가입',
        '모든 조리 공정 QR코드 VOD 4K 밀착 직캠 하이라이트 평생 연동',
        '최종 이메일 동기화 PDF 배포',
      ],
      pdfSpecInfo: '실물 하드커버 양장 양면 인쇄본 무료 익일 택배 발송 & eBook 동시 디지털 교부',
    },
  ];

  // Selected Book and Purchase simulated states
  const [selectedBookId, setSelectedBookId] = useState('book-secret-recipes');
  const [isBookPurchased, setIsBookPurchased] = useState<Record<string, boolean>>({});
  const [isPurchasing, setIsPurchasing] = useState(false);

  const selectedBook = books.find((b) => b.id === selectedBookId) || books[0];

  const handlePurchaseBook = (bookId: string) => {
    setIsPurchasing(true);
    setTimeout(() => {
      setIsPurchasing(false);
      setIsBookPurchased((prev) => ({ ...prev, [bookId]: true }));
      alert(
        `🎉 [${selectedBook.title}] 도서 및 디지털 비밀 배합 배포 패키지 구매가 정상 승인되었습니다! 가입하신 메일로 원가계산 전용 스마트 엑셀 프로그램과 레시피 PDF 교재가 즉시 직동 교부되었습니다.`,
      );
    }, 1200);
  };

  const handleDownloadMaterials = (bookTitle: string) => {
    alert(
      `📥 [${bookTitle}] 수강생 전용 상업용 오토 엑셀 배합 파일 및 교안 PDF 파일 다운 로드를 시작합니다. (Atelier-Creme-Secret-Recipe.zip)`,
    );
  };

  return (
    <div
      id="books-screen"
      className="bg-[#FAF4EA] min-h-screen text-[#2A211B] font-sans selection:bg-[#B65538]/20 selection:text-[#B65538]"
    >
      {/* Editorial Title Banner */}
      <section className="pt-12 pb-16 px-6 sm:px-12 max-w-7xl mx-auto border-b border-[#EFE8DC]/80">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B1863C]/10 text-[#B1863C] text-[11px] font-bold tracking-widest uppercase border border-[#B1863C]/20 shadow-sm">
            <BookOpen size={12} />
            EXQUISITE LESSON MANUALS
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#2A211B] leading-tight keep-all break-keep">
            오너 파티시에의 비공개{' '}
            <span className="font-serif italic text-[#B65538]">비밀 레시피 북</span>
          </h1>
          <p className="text-sm text-[#5F4E43] font-light leading-relaxed max-w-2xl mx-auto keep-all break-keep">
            매일 아침 부지런하게 구워지며 소리 없이 전석 매진을 그려내는 한남동 크렘 쇼룸의 오리지널
            레시피 설계 기획서. 동영상 강의의 깊이를 더욱 예리하게 보강해주는 실전 교안 도서를 평생
            영구 소장하시고, 매장 매출의 고품격 돌파구를 만드세요.
          </p>
        </div>
      </section>

      {/* Main Dual Columns Layout */}
      <section className="py-12 px-6 sm:px-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Side: Books Selector & Thumbnails */}
        <div className="lg:col-span-4 space-y-6">
          <h3 className="font-serif text-xs font-bold text-[#B0863C] tracking-wider uppercase mb-2">
            Select Edition
          </h3>

          <div className="space-y-4">
            {books.map((b) => {
              const active = b.id === selectedBookId;
              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBookId(b.id)}
                  className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex gap-4 ${
                    active
                      ? 'bg-white border-[#B65538] shadow-md -translate-y-0.5'
                      : 'bg-white/50 border-[#EFE8DC] hover:bg-white hover:border-[#B1863C]/40'
                  }`}
                >
                  {/* Book Spine Portrait Preview Mockup */}
                  <div className="w-16 sm:w-20 aspect-[3/4] bg-[#2A211B] rounded overflow-hidden shadow-md shrink-0 relative">
                    <img
                      referrerPolicy="no-referrer"
                      src={b.thumbnail}
                      alt=""
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100"
                    />
                    <div className="absolute top-1 left-1.5 bg-[#B65538] text-[7px] text-white font-extrabold px-1 rounded">
                      BEST
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[9.5px] text-[#B0863C] font-semibold tracking-wider block mb-1 uppercase">
                        {b.edition}
                      </span>
                      <h4 className="font-serif text-sm font-bold text-[#2A211B] leading-snug line-clamp-2">
                        {b.title}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs font-bold text-[#B65538]">
                        ₩{b.price.toLocaleString()}원
                      </span>
                      <span className="text-[10px] text-gray-400">({b.pages} 페이지)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Special Promotion Badge */}
          <div className="p-6 bg-[#2A211B] text-[#FAF4EA] rounded-2xl border border-[#B0863C]/30 space-y-4">
            <span className="text-[9px] bg-[#B65538] px-2 py-0.5 rounded font-extrabold tracking-widest uppercase">
              PROMOTION
            </span>
            <h4 className="font-serif text-base font-bold">도서 전종 마스터 번들 특가 패키지</h4>
            <p className="text-[11px] text-white/70 leading-relaxed font-light">
              마카롱 바이블과 시그니처 구움과자 책을 동시에 소장하시는 분들께 1:1 민소희 마스터
              이메일 오븐 분석권 3회를 더불어 무상 전개해 드립니다.
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  handlePurchaseBook('bundle');
                }}
                className="w-full py-2.5 bg-[#B0863C] text-[#2A211B] text-xs font-bold rounded-xl hover:bg-[#FAF4EA] hover:text-[#2A211B] transition-colors cursor-pointer text-center"
              >
                번들 패키지 파격 할인가로 소장
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: High-End Details, Contents, Specifications */}
        <div className="lg:col-span-8 bg-white border border-[#EFE8DC] rounded-3xl p-6 sm:p-10 space-y-8 shadow-sm">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EFE8DC] pb-5">
              <div>
                <span className="text-[11px] text-[#B1863C] font-bold block mb-1">
                  SELECTED MANUAL
                </span>
                <span className="text-[10px] bg-[#FAF4EA] border border-[#EFE8DC] text-[#5F4E43] px-2.5 py-1 rounded font-medium">
                  {selectedBook.edition}
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2A211B] mt-2 leading-tight">
                  {selectedBook.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#B65538] font-medium font-serif mt-1">
                  {selectedBook.subTitle}
                </p>
              </div>

              {/* Price & Discount Indicator */}
              <div className="text-right shrink-0 bg-[#FAF4EA] p-4 rounded-xl border border-[#EFE8DC]">
                <span className="text-xs text-stone-400 line-through block">
                  ₩{selectedBook.originalPrice.toLocaleString()}원
                </span>
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="text-[#B65538] text-xs font-black">
                    {selectedBook.discountPercent}% OFF
                  </span>
                  <span className="text-xl font-bold text-[#2A211B]">
                    ₩{selectedBook.price.toLocaleString()}
                  </span>
                </div>
                <span className="text-[10px] text-stone-400 font-light block mt-0.5">
                  배송비 전액 0원 무료 지원
                </span>
              </div>
            </div>

            {/* Core Description Text */}
            <p className="text-[#5F4E43] text-sm leading-relaxed font-light">
              {selectedBook.description}
            </p>
          </div>

          {/* Book Chapters Accordion list */}
          <div className="space-y-3 bg-[#FAF4EA]/40 p-6 rounded-2xl border border-[#EFE8DC]/70">
            <h4 className="font-serif text-sm font-bold text-[#2A211B] flex items-center gap-2">
              <span className="w-1.5 h-3 bg-[#B1863C] rounded-full inline-block" />
              단행본 수록 목차 및 비밀 챕터 세부보기 ({selectedBook.chapters.length}개 부장)
            </h4>

            <div className="divide-y divide-[#EFE8DC] text-xs">
              {selectedBook.chapters.map((ch) => (
                <div key={ch} className="py-3 font-medium text-[#5F4E43] flex items-start gap-2.5">
                  <Check size={13} className="text-[#B1863C] mt-0.5 shrink-0" />
                  <span>{ch}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Exclusive Benefits Badges list (Pro use tools auto excel, pdf downloads) */}
          <div className="space-y-4">
            <h4 className="font-serif text-sm font-bold text-[#2A211B] flex items-center gap-2">
              <span className="w-1.5 h-3 bg-[#B65538] rounded-full inline-block" />
              수강생 전용 3대 동시 상속 혜택
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {selectedBook.benefits.map((ben, idx) => (
                <div
                  key={ben}
                  className="p-4 rounded-xl border border-[#EFE8DC] bg-white space-y-2 flex flex-col justify-between"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#FAF4EA] text-[#B65538] flex items-center justify-center text-xs font-bold font-mono">
                    0{idx + 1}
                  </div>
                  <p className="text-xs font-medium text-[#2A211B] leading-relaxed">{ben}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Simulated specs / terms label */}
          <div className="p-4 bg-yellow-50/50 border border-yellow-100 rounded-xl">
            <p className="text-[10.5px] text-[#B0863C] font-semibold">동시 다운로드 보증 안내</p>
            <p className="text-[10px] text-[#5F4E43] mt-0.5 font-light leading-relaxed">
              {selectedBook.pdfSpecInfo}. 결제 완료 후 12시간 이내에 택배 발송 번호가 문자로 동기화
              연동됩니다.
            </p>
          </div>

          {/* Action buttons area */}
          <div className="pt-4 border-t border-[#EFE8DC] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Star size={14} className="fill-[#B0863C] text-none" />
              <strong className="text-xs text-[#2A211B]">독자 평균 만족도 4.97점</strong>
              <span className="text-[11px] text-gray-400">|</span>
              <span className="text-[10.5px] text-gray-400">누적 판매 1,840권 돌파</span>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              {isBookPurchased[selectedBook.id] ? (
                <>
                  <button
                    onClick={() => handleDownloadMaterials(selectedBook.title)}
                    className="flex-1 sm:flex-none px-6 py-3 bg-[#B0863C] hover:bg-[#9a7432] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <Download size={14} />
                    <span>상업 엑셀 & 비밀 PDF 다운받기</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsBookPurchased((prev) => ({ ...prev, [selectedBook.id]: false }));
                    }}
                    className="px-4 py-3 bg-white border border-[#EFE8DC] text-stone-400 text-xs rounded-xl"
                  >
                    소장 리셋
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handlePurchaseBook(selectedBook.id)}
                  disabled={isPurchasing}
                  className="w-full sm:w-auto px-10 py-3 bg-[#B65538] hover:bg-[#A0452C] disabled:bg-stone-300 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag size={14} />
                  <span>
                    {isPurchasing
                      ? '보안 인증 및 결제 승인 중...'
                      : '도서 즉시 평생 소장 라이선스 획득'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Trust guarantees badge line */}
      <section className="py-12 bg-white/50 border-t border-[#EFE8DC]/80">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <h4 className="font-serif text-sm font-bold text-[#2A211B]">익일 전액 무료 직배송</h4>
            <p className="text-[10px] text-[#5F4E43] font-light">전국 우체국 특별 안심배송 연동</p>
          </div>
          <div className="space-y-1">
            <h4 className="font-serif text-sm font-bold text-[#2A211B]">
              평생 스마트 엑셀 무료 패원
            </h4>
            <p className="text-[10px] text-[#5F4E43] font-light">
              사재 원재료 시세 연어 자동 수혈 기능
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="font-serif text-sm font-bold text-[#2A211B]">스페셜 전용 자료실 개설</h4>
            <p className="text-[10px] text-[#5F4E43] font-light">
              민소희 마스터 독점 첨삭 PDF 평생공유
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="font-serif text-sm font-bold text-[#2A211B]">개정 증보판 무제한 갱신</h4>
            <p className="text-[10px] text-[#5F4E43] font-light">
              배송비용 하나로 모바일 리커버 평생갱신
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
