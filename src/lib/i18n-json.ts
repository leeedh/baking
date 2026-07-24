/**
 * jsonb 다국어 필드({"ko":"...","en":"..."})에서 현재 로케일 값을 안전 추출.
 * 없으면 ko → 첫 값 순으로 폴백한다. (카탈로그·상세·학습 페이지 공용)
 */
export function pickLocale(json: unknown, locale: string): string {
  const map = (json ?? {}) as Record<string, string>;
  return map[locale] ?? map.ko ?? Object.values(map)[0] ?? '';
}
