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
  /** courses.id(uuid) — ClassItem.id는 라우팅 키인 slug라 후기 API에는 쓸 수 없다. */
  courseId: string;
  chapters: DetailChapter[];
  reviews: ReviewItem[];
  /** 활성 수강권 보유 여부 — 후기 작성 폼 노출 조건(DC-60). */
  canReview: boolean;
  /** 이미 작성한 본인 후기(클래스당 1건). 없으면 null. */
  myReview: MyReview | null;
}

/** 로그인 사용자가 이 클래스에 남긴 후기. */
export interface MyReview {
  id: string;
  rating: number;
  content: string;
}

/** 운영자 대시보드 KPI(실집계). 전환율 카드는 방문자 추적 데이터 부재로 제외(DC-50). */
export interface AdminKpi {
  /** 당월/누적 유효 매출(paid 주문 합, KRW). */
  salesTotal: number;
  /** 누적 active 수강권 수. */
  studentsTotal: number;
  /** 전체 active 수강권 평균 진도율(%). */
  completionRate: number;
}

/** 운영자 클래스 관리 테이블 행(admin_course_stats 파생). */
export interface AdminClassRow {
  /** courses.id(UUID) — 실 CRUD 대상. */
  id: string;
  title: string;
  instructor: string;
  instructorTitle: string;
  price: number;
  listPrice: number;
  status: 'draft' | 'published';
  salesCount: number;
  revenue: number;
  activeEnrollments: number;
  /** 평균 진도율(%). */
  completionRate: number;
}

/** 운영자 주문·환불 목록 행. */
export interface AdminOrderRow {
  id: string;
  /** 구매자 표기(이메일 또는 이름). */
  buyer: string;
  /** 클래스명(로케일 반영). */
  courseTitle: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'canceled' | 'refunded';
  /** 결제 완료 시각(ISO, 없으면 생성 시각). */
  paidAt: string | null;
  /** 환불(취소) 시각(ISO). */
  canceledAt: string | null;
}

export interface AdminDashboard {
  kpi: AdminKpi;
  classes: AdminClassRow[];
  orders: AdminOrderRow[];
}

/** 운영자 화면의 자료 행(Storage 경로는 노출하지 않음). */
export interface AdminMaterial {
  id: string;
  title: string;
  sizeBytes: number | null;
}

/** 운영자 차시 편집용 행(lessons 원본, i18n 텍스트는 ko/en 분리 노출). */
export interface AdminLesson {
  id: string;
  titleKo: string;
  titleEn: string;
  chapterIndex: number;
  chapterTitleKo: string;
  chapterTitleEn: string;
  orderIndex: number;
  durationSec: number | null;
  isPreview: boolean;
  /** Mux 영상 준비 여부(재생 ID는 노출하지 않음). */
  hasVideo: boolean;
  /** 차시에 등록된 레시피 자료(DC-58). */
  materials: AdminMaterial[];
}

/** 차시 관리 페이지 서버 로드 결과. */
export interface AdminCourseLessons {
  courseId: string;
  courseTitle: string;
  lessons: AdminLesson[];
}
