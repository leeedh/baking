import { CLASSES_DATA } from '@/data';
import type { ClassItem } from '@/types';
import { create } from 'zustand';

// 목업 상태 스토어. 인증은 Supabase(AuthProvider, EPIC-C)로 이관됨.
// 구매(purchasedClassIds)·카탈로그(classesList)는 아직 목업 — EPIC-D(결제)·EPIC-F(운영콘솔)에서
// enrollments/courses 실 테이블 연동으로 교체 예정.
interface AppStoreState {
  purchasedClassIds: string[];
  classesList: ClassItem[];
  addPurchased: (classId: string) => void;
  addClass: (newClass: ClassItem) => void;
}

export const useAppStore = create<AppStoreState>((set) => ({
  purchasedClassIds: ['class-cookies'], // pre-own cookies so "My Classes" isn't empty on load
  classesList: CLASSES_DATA,
  addPurchased: (classId) =>
    set((state) =>
      state.purchasedClassIds.includes(classId)
        ? state
        : { purchasedClassIds: [...state.purchasedClassIds, classId] },
    ),
  addClass: (newClass) => set((state) => ({ classesList: [newClass, ...state.classesList] })),
}));

/** Resolve a class by id, falling back to the first class (mirrors legacy behavior). */
export function useClassById(classId: string): ClassItem {
  return useAppStore((s) => s.classesList.find((c) => c.id === classId) ?? s.classesList[0]);
}
