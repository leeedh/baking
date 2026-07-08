import type { ClassItem, ClassManagementItem, CurriculumChapter, KPIStats, Review } from './types';

export const CLASSES_DATA: ClassItem[] = [
  {
    id: 'class-macarons',
    title: '프렌치 정통 파티스리 - 피에르 마카롱 & 생토노레 마스터 클래스',
    instructor: '민소희 (Sohee Min)',
    instructorTitle: 'Atelier Crème 대표 파티시에 (Ritz Escoffier Paris 그랑 디플로마 장학생 졸업)',
    description:
      '프랑스 정통 제과의 비밀을 속속들이 파헤칩니다. 마카롱 꼬끄의 완벽한 피에(Foot)를 올리는 머랭 온도 제어법부터 바닐라 무슬린 크림, 무화과 콩피츄르, 초콜릿 가나슈 필링의 정교한 밸런싱까지 전수합니다. 타이베이와 서울의 마스터 오디토리엄에서 극찬을 받은 하이엔드 테크닉을 집에서 평생 소장하며 마스터하세요.',
    price: 189000,
    originalPrice: 280000,
    rating: 4.9,
    reviewCount: 328,
    thumbnail:
      'https://images.unsplash.com/photo-1569864358642-9d1684040f43?auto=format&fit=crop&q=80&w=1200',
    category: '정통 프렌치 디저트',
    level: '중급',
    duration: '총 12차시 (7시간 40분)',
    studentsCount: 2450,
    tags: ['프렌치 파티스리', '머랭 기술', '고급 제과'],
  },
  {
    id: 'class-cookies',
    title: '카라멜 테라코타 구움과자 - 리치 휘낭시에, 솔티드 쿠키 & 명품 마들렌',
    instructor: '민소희 (Sohee Min)',
    instructorTitle: '한남동 크렘 오너 파티시에, 대만 워크숍 누적 매진',
    description:
      '프랑스 고메 버터를 태우는 ‘헤이즐넛 버터(Beurre Noisette)’의 황금 온도와 깊은 풍미를 구현합니다. 속은 쫀득하고 겉은 극도로 바삭한 명품 구움과자의 텍스처를 완성하는 프로의 오븐 스케줄링. 카라멜 테라코타 포인트의 고급 클래식 터치를 가미한 크렘 오리지널 레시피 5종을 소개합니다.',
    price: 145000,
    originalPrice: 198000,
    rating: 4.8,
    reviewCount: 412,
    thumbnail:
      'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&q=80&w=1200',
    category: '클래식 구움과자',
    level: '초급',
    duration: '총 10차시 (5시간 15분)',
    studentsCount: 3890,
    tags: ['구움과자', '헤이즐넛 버터', '선물용 패키징'],
  },
  {
    id: 'class-tart',
    title: '타르트 에디토리얼 - 제철 생과일 생또노레 & 시그니처 크레뫼 바닐라 타르트',
    instructor: '민소희 (Sohee Min)',
    instructorTitle: 'Atelier Crème 대표 파티시에 (대만 타이베이 워크숍 초빙 수석 마스터 디렉터)',
    description:
      '밀가루와 고메 버터가 완벽한 결을 이루는 파트 사블레(Pâte Sablée) 제작법부터 시작합니다. 입안 가득 크리미함을 남기는 클래식 크렘 파티시에와 카라멜라이징 피칸, 은은하게 풍기는 오렌지 블라썸의 우아한 마리아주. 대만 구르메 세션에서 매번 기립박수를 받은 아티스트 전용 아틀리에 커리큘럼.',
    price: 210000,
    originalPrice: 295000,
    rating: 5.0,
    reviewCount: 184,
    thumbnail:
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=1200',
    category: '모던 타르트',
    level: '상급',
    duration: '총 14차시 (9시간 25분)',
    studentsCount: 1240,
    tags: ['고급 타르트', '파트 사블레', '크레뫼 공법'],
  },
];

export const CURRICULUM_DATA: Record<string, CurriculumChapter[]> = {
  'class-macarons': [
    {
      id: 'mac-ch1',
      title: 'Chapter 1: 프리미엄 에센셜 - 오븐 분석과 머랭의 두 가지 법칙',
      order: 1,
      lessons: [
        {
          id: 'mac-les-1',
          title: '01차시: [무료 보기] 오리엔테이션 및 정통 프렌치 머랭을 올리는 기후별 수분 관리',
          duration: '22:15',
          order: 1,
          isFree: true,
          videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        },
        {
          id: 'mac-les-2',
          title: '02차시: 완벽한 꼬끄를 위한 프렌치 머랭 vs 이탈리안 머랭 최적의 온도 설계',
          duration: '35:40',
          order: 2,
          isFree: false,
          videoUrl: 'https://www.w3schools.com/html/movie.mp4',
        },
      ],
    },
    {
      id: 'mac-ch2',
      title: 'Chapter 2: 실전 메이킹 - 마카로나쥬의 압력 조절과 건조 테크닉',
      order: 2,
      lessons: [
        {
          id: 'mac-les-3',
          title: '03차시: 반죽의 광택과 질감으로 읽는 마카로나쥬(Macaronage) 중단 타이밍',
          duration: '28:10',
          order: 3,
          isFree: false,
          videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        },
        {
          id: 'mac-les-4',
          title: '04차시: 가습기 없는 작업실에서도 실패 없는 건조 시간과 피에(Pie) 오븐 설정',
          duration: '31:55',
          order: 4,
          isFree: false,
          videoUrl: 'https://www.w3schools.com/html/movie.mp4',
        },
      ],
    },
    {
      id: 'mac-ch3',
      title: 'Chapter 3: 하이엔드 가나슈 필링 - 꼬끄와의 일체감을 주는 가나슈',
      order: 3,
      lessons: [
        {
          id: 'mac-les-5',
          title: '05차시: 유분의 분리 없이 매끈하게 유화되는 가나슈 템퍼링 필링 법',
          duration: '42:15',
          order: 5,
          isFree: false,
          videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        },
      ],
    },
  ],
  'class-cookies': [
    {
      id: 'cook-ch1',
      title: 'Chapter 1: 구움과자 핵심 가이드 - 버터 태우기와 글루텐 제어',
      order: 1,
      lessons: [
        {
          id: 'cook-les-1',
          title: '01차시: [무료 보기] 오리엔테이션 및 헤이즐넛 버터 구현의 끓는점 판별법',
          duration: '18:40',
          order: 1,
          isFree: true,
          videoUrl: 'https://www.w3schools.com/html/movie.mp4',
        },
        {
          id: 'cook-les-2',
          title: '02차시: 밀가루 글루텐 형성 최소화로 구음과자 최적의 촉촉함 연출하기',
          duration: '24:50',
          order: 2,
          isFree: false,
          videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        },
      ],
    },
    {
      id: 'cook-ch2',
      title: 'Chapter 2: 오리지널 레시피 마스터',
      order: 2,
      lessons: [
        {
          id: 'cook-les-3',
          title: '03차시: 완벽한 하이 돔 형태를 그리며 팽창하는 프랑스 구르메 마들렌 틀 세팅',
          duration: '33:15',
          order: 3,
          isFree: false,
          videoUrl: 'https://www.w3schools.com/html/movie.mp4',
        },
      ],
    },
  ],
  'class-tart': [
    {
      id: 'tart-ch1',
      title: 'Chapter 1: 파트 사블레 오리지널 빌딩과 숙성 공법',
      order: 1,
      lessons: [
        {
          id: 'tart-les-1',
          title: '01차시: [무료 보기] 버터와 밀가루의 샌딩 공법, 차갑게 굳히는 휴지 스케줄링',
          duration: '25:30',
          order: 1,
          isFree: true,
          videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        },
        {
          id: 'tart-les-2',
          title: '02차시: 타르트 틀 안쪽까지 빈틈 없이 안착시키는 프로 셰프의 폰사주(Fonçage) 비결',
          duration: '31:45',
          order: 2,
          isFree: false,
          videoUrl: 'https://www.w3schools.com/html/movie.mp4',
        },
      ],
    },
  ],
};

export const REVIEWS_DATA: Review[] = [
  {
    id: 'rev-1',
    classId: 'class-macarons',
    userName: '김은지 (Eunji Kim)',
    rating: 5,
    date: '2026.05.28',
    content:
      '대만 유학가기 전에 항상 디저트 공부하면서 애태웠던 머랭 조절을 이 강의로 완전 극복했어요! 꼬끄 밑면이 비는 현상(할로우)이 왜 일어나는지 정확한 이론으로 설명해주셔서 너무 통쾌합니다. 벌써 평생 소장 강의만 세 번 돌려봤네요.',
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
  },
  {
    id: 'rev-2',
    classId: 'class-macarons',
    userName: 'Chao-Jung Chen',
    rating: 5,
    date: '2026.05.15',
    content:
      '我在台北親自參加過謝芙的實體課，沒想到VOD影片解析度這麼高，甚至比在現場看還清晰！烤箱控溫的段落講解特別細緻，非常推薦給想要追求法式經典口感的烘焙愛好者！🥰',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
  },
  {
    id: 'rev-3',
    classId: 'class-cookies',
    userName: '박도현 (Dohyun Park)',
    rating: 4,
    date: '2026.06.01',
    content:
      '카페 사이드 베이킹용으로 주문해서 수강중입니다. 손님들이 휘낭시에 먹어보더니 겉바속촉이 수준급이라고 칭찬하네요. 탄버터 거르는 팁 덕분에 구움색이 너무 예쁜 카라멜 빛깔로 구워져서 가판대 존재감이 엄청납니다.',
    avatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
  },
  {
    id: 'rev-4',
    classId: 'class-tart',
    userName: '이지수 (Jisoo Lee)',
    rating: 5,
    date: '2026.06.07',
    content:
      '상급이라 확실히 정교한 계산과 감각이 많이 요구됩니다. 폰사주 할 때 매번 모서리가 찢어지던 설움이 싹 들어갔어요. 생또노레 카라멜 코팅할 때 손을 델까 봐 무서웠는데, 안전하고 고급스럽게 완성할 수 있는 팁 최고입니다!',
    avatar:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150',
  },
];

export const KPI_DASHBOARD_DATA: KPIStats = {
  salesTotal: 48942000,
  salesGrowth: '+12.4% (전월 대비)',
  studentsTotal: 7580,
  studentsGrowth: '+8.2% (전월 대비)',
  conversionRate: 3.84,
  conversionGrowth: '+0.54% (상승)',
  completionRate: 64.2,
  completionGrowth: '+2.1% (상승)',
};

export const CLASS_MANAGEMENT_DATA: ClassManagementItem[] = [
  {
    id: 'class-macarons',
    title: '프렌치 정통 파티스리 - 피에르 마카롱 & 생토노레 마스터 클래스',
    instructor: '민소희',
    price: 189000,
    salesCount: 2450,
    revenue: 463050000,
    completionRate: 68.4,
  },
  {
    id: 'class-cookies',
    title: '카라멜 테라코타 구움과자 - 리치 휘낭시에, 솔티드 쿠키 & 명품 마들렌',
    instructor: '민소희',
    price: 145000,
    salesCount: 3890,
    revenue: 564050000,
    completionRate: 72.1,
  },
  {
    id: 'class-tart',
    title: '타르트 에디토리얼 - 제철 생과일 생또노레 & 시그니처 타르트',
    instructor: '민소희',
    price: 210000,
    salesCount: 1240,
    revenue: 260400000,
    completionRate: 52.8,
  },
];
