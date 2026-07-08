import { CLASSES_DATA } from '@/data';
import type { ClassItem } from '@/types';
import { create } from 'zustand';

interface AppStoreState {
  isLoggedIn: boolean;
  userEmail: string;
  purchasedClassIds: string[];
  classesList: ClassItem[];
  login: (email: string) => void;
  logout: () => void;
  addPurchased: (classId: string) => void;
  addClass: (newClass: ClassItem) => void;
}

export const useAppStore = create<AppStoreState>((set) => ({
  isLoggedIn: true,
  userEmail: 'ldhl4468@gmail.com', // Pre-filled with user metadata for immediate premium experience
  purchasedClassIds: ['class-cookies'], // pre-own cookies so "My Classes" screen isn't empty on load
  classesList: CLASSES_DATA,
  login: (email) => set({ isLoggedIn: true, userEmail: email }),
  logout: () => set({ isLoggedIn: false, userEmail: '' }),
  addPurchased: (classId) =>
    set((state) =>
      state.purchasedClassIds.includes(classId)
        ? state
        : { purchasedClassIds: [...state.purchasedClassIds, classId] },
    ),
  addClass: (newClass) => set((state) => ({ classesList: [newClass, ...state.classesList] })),
}));

/** Resolve a class by id, falling back to the first class (mirrors legacy App.tsx behavior). */
export function useClassById(classId: string): ClassItem {
  return useAppStore((s) => s.classesList.find((c) => c.id === classId) ?? s.classesList[0]);
}
