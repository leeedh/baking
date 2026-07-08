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
