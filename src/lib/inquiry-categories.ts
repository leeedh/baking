/**
 * 문의 분류 — API(Zod enum)와 DB(`inquiries.category`)에 그대로 저장되는 **값**이다.
 * 번역 대상이 아니며, 화면에 보이는 라벨만 메시지 카탈로그(`inquiries.category.*`)에서 꺼낸다.
 *
 * 예전에는 이 목록이 api/inquiries/route.ts와 InquiriesScreen에 따로 있어 한쪽만 바꾸면
 * 400이 나는 구조였다. 계약이므로 한 곳에서만 정의한다.
 */
export const INQUIRY_CATEGORIES = [
  { value: '결제', labelKey: 'payment' },
  { value: '수강', labelKey: 'enrollment' },
  { value: '영상', labelKey: 'video' },
  { value: '자료', labelKey: 'materials' },
  { value: '기타', labelKey: 'other' },
] as const;

export type InquiryCategory = (typeof INQUIRY_CATEGORIES)[number]['value'];

/** Zod enum·기본값용 값 배열. */
export const INQUIRY_CATEGORY_VALUES = INQUIRY_CATEGORIES.map((c) => c.value) as unknown as [
  InquiryCategory,
  ...InquiryCategory[],
];

/** 기본 분류 — DB 컬럼 default와 같아야 한다. */
export const DEFAULT_INQUIRY_CATEGORY: InquiryCategory = '기타';

/** 저장된 값 → 라벨 키. 알 수 없는 값이면 undefined(호출부가 원문을 그대로 보여준다). */
export function inquiryCategoryLabelKey(value: string): string | undefined {
  return INQUIRY_CATEGORIES.find((c) => c.value === value)?.labelKey;
}
