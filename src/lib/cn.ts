import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 조건부 클래스 병합. tailwind-merge를 거치므로 프리미티브의 기본 클래스를
 * 호출부의 className으로 덮어쓸 수 있다(`<Button className="rounded-full">`).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
