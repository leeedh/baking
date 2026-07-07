import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'ko' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<string, Record<Language, string>> = {
  // Navigation & Header
  'nav.books': { ko: '도서 상점', en: 'Book Shop' },
  'nav.instructor': { ko: '강사 소개', en: 'Meet Chef' },
  'nav.myclasses': { ko: '내 클래스', en: 'My Classes' },
  'nav.dashboard': { ko: '운영대시보드', en: 'Admin Dashboard' },
  'nav.login': { ko: '로그인 / 회원가입', en: 'Sign In / Register' },
  'nav.logout': { ko: '로그아웃', en: 'Sign Out' },
  'nav.student': { ko: '수강생', en: 'Student' },

  // Hero Section
  'hero.subtitle': { ko: 'ARTISAN MASTERY CLASS', en: 'ARTISAN MASTERY CLASS' },
  'hero.title1': { ko: '완벽이라는 감각,', en: 'The Sense of Perfection,' },
  'hero.title2': { ko: '오븐 속의 정밀한 미학', en: 'Precise Oven Aesthetics' },
  'hero.desc': {
    ko: '기온과 수분을 완벽하게 통제하여 가공하는 프랑스 정통 제과의 품격. 디저트 브랜드의 격을 바꾸는 현업 비법 평생 소장 VOD 세션.',
    en: 'The prestige of authentic French pastry crafted with temperature and humidity control. Lifetime-access VODs to elevate your dessert brand.'
  },
  'hero.searchPlaceholder': { ko: '마카롱, 휘낭시에, 클래식 구움과자 검색...', en: 'Search macarons, financiers, classic pastries...' },
  'hero.exploreBtn': { ko: '시그니처 컬렉션 탐색', en: 'Explore Signature' },
  'hero.quizBtn': { ko: '1:1 맞춤 코스 제안', en: '1:1 Custom Proposal' },

  // DNA Quiz
  'quiz.badge': { ko: 'Matchmaking Quiz', en: 'Matchmaking Quiz' },
  'quiz.title': { ko: '나의 베이킹 DNA 추천 진단', en: 'My Baking DNA Matchmaker' },
  'quiz.desc': {
    ko: '정밀한 과학적 계량부터 감각적인 트렌디 플레이팅까지, 나에게 100% 동기화될 최적의 클래스 코스를 1분 만에 진단해 드립니다.',
    en: 'From scientific calibration to trendy artistic plating, find your 100% matched baking course in under 1 minute.'
  },
  'quiz.start': { ko: '베이킹 DNA 진단 시작하기', en: 'Launch DNA Matchmaker Quiz' },

  // Three Pillars Philosophy
  'pillars.pill': { ko: 'Premium Standard', en: 'Premium Standard' },
  'pillars.title': { ko: '일반 베이킹 강의들과 극명하게 대비되는 차이점', en: 'The Definitive Atelier Crème Standard' },
  'pillars.desc': {
    ko: '단순히 레시피 받아쓰기 교육으로는 매장 경쟁력을 높이거나 감탄사를 만들어내는 텍스처를 빚어낼 수 없습니다. 프로들의 노하우를 가장 완벽하게 전달합니다.',
    en: 'Simple recipe tracing cannot elevate store competitiveness or craft breathtaking textures. We transmit authentic master-level secrets.'
  },

  // Class Grid
  'grid.badge': { ko: 'ONLINE MASTERCLASSES', en: 'ONLINE MASTERCLASSES' },
  'grid.title': { ko: '아티장 마스터 클래스 평생 소장 패키지', en: 'Artisan Masterclass VOD Archives' },
  'grid.desc': {
    ko: '파리 유서 깊은 교육관의 유산과 수천 번의 매장 필드 실증을 통해 설계된 아카이브 컬렉션입니다.',
    en: 'Archived master collections designed through Parisian culinary bloodlines and thousands of retail validations.'
  },
  'grid.all': { ko: '전체 클래스', en: 'All' },
  'grid.searchEmpty': { ko: '검색어와 부합하는 마스터클래스가 존재하지 않습니다.', en: 'No masterclasses matched your search query.' },
  'grid.searchEmptyDesc': { ko: '다른 검색어를 입력하시거나 카테고리 필터를 변경해 보세요.', en: 'Try entering another search keyword or changing the category filter.' },

  // Card & Detail buttons
  'btn.detail': { ko: '상세 레시피 보기', en: 'View Cook Book Recipe' },
  'btn.preview': { ko: '무료 맛보기 1차시 재생', en: 'Free Preview First Lecture' },
  'btn.purchase': { ko: '라이선스 영구 소장하기', en: 'Acquire Lifetime Access' },
  'btn.premiumBadge': { ko: '평생 무제한 소장', en: 'Lifetime Access Pass' },
  'btn.rating': { ko: '평점 {rating} ({count}개 후기)', en: 'Rating {rating} ({count} reviews)' },

  // Footer / Common
  'footer.rights': { ko: '© 2026 Atelier Crème Inc. 모든 권리 보유.', en: '© 2026 Atelier Crème Inc. All rights reserved.' },
  'footer.chef': { ko: '대표 아티장 셰프: 민소희', en: 'Head Artisan Chef: Sohee Min' }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('ko');

  const t = (key: string): string => {
    const raw = translations[key];
    if (!raw) return key;
    return raw[language] || raw['ko'] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
