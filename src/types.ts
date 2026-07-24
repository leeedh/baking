export interface ClassItem {
  id: string;
  title: string;
  instructor: string;
  instructorTitle: string;
  description: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviewCount: number;
  thumbnail: string;
  category: string;
  level: '초급' | '중급' | '상급';
  duration: string;
  studentsCount: number;
  tags: string[];
}

export interface CurriculumLesson {
  id: string;
  title: string;
  duration: string;
  order: number;
  isFree: boolean;
  videoUrl: string;
}

export interface CurriculumChapter {
  id: string;
  title: string;
  order: number;
  lessons: CurriculumLesson[];
}

export interface Review {
  id: string;
  classId: string;
  userName: string;
  rating: number;
  date: string;
  content: string;
  avatar: string;
}

/** 상세 화면 커리큘럼 차시 — 서버(DB)에서 파생, 잠긴 차시 포함. */
export interface DetailLesson {
  id: string;
  title: string;
  /** mm:ss 표기(재생시간 미상이면 '--:--'). */
  duration: string;
  /** DB is_preview — 비구매자 무료 미리보기 허용 여부. */
  isPreview: boolean;
  /** Mux 영상 준비 여부. */
  hasVideo: boolean;
}

export interface DetailChapter {
  id: string;
  title: string;
  lessons: DetailLesson[];
}

/** 상세 화면 후기 항목 — reviews + profiles 조인 결과. */
export interface ReviewItem {
  id: string;
  userName: string;
  avatar: string;
  rating: number;
  /** YYYY.MM.DD 표기. */
  date: string;
  content: string;
}

/** 상세 페이지 서버 로드 결과(클래스 메타 + 커리큘럼 + 후기). */
export interface CourseDetail {
  course: ClassItem;
  chapters: DetailChapter[];
  reviews: ReviewItem[];
}

export interface KPIStats {
  salesTotal: number;
  salesGrowth: string;
  studentsTotal: number;
  studentsGrowth: string;
  conversionRate: number;
  conversionGrowth: string;
  completionRate: number;
  completionGrowth: string;
}

export interface ClassManagementItem {
  id: string;
  title: string;
  instructor: string;
  price: number;
  salesCount: number;
  revenue: number;
  completionRate: number;
}
