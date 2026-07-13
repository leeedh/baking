import { CLASSES_DATA } from '@/data';
import type { ClassItem } from '@/types';
import { create } from 'zustand';

// 목업 카탈로그 스토어. 인증은 EPIC-C(Supabase Auth), 구매/수강권은 EPIC-D(enrollments)로
// 실데이터 이관 완료. 카탈로그(classesList)만 목업으로 남음 — EPIC-F(운영콘솔)에서
// courses 실 테이블 연동으로 교체 예정.
interface AppStoreState {
  classesList: ClassItem[];
  addClass: (newClass: ClassItem) => void;
}

export const useAppStore = create<AppStoreState>((set) => ({
  classesList: CLASSES_DATA,
  addClass: (newClass) => set((state) => ({ classesList: [newClass, ...state.classesList] })),
}));

/** Resolve a class by id, falling back to the first class (mirrors legacy behavior). */
export function useClassById(classId: string): ClassItem {
  return useAppStore((s) => s.classesList.find((c) => c.id === classId) ?? s.classesList[0]);
}
