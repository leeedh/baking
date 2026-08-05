/**
 * 카탈로그 카테고리 필터 — 값은 `courses.category`(DB)와 대조하는 **데이터**라 번역하지 않는다.
 * 화면 라벨은 메시지 카탈로그(`sections.catalog.category.*`)에서 꺼낸다.
 *
 * DB 콘텐츠 자체의 영문화는 별건이다(Jira DC-108) — 그때 이 매핑도 함께 정리한다.
 */
export const COURSE_CATEGORIES = [
  { value: '정통 프렌치 디저트', labelKey: 'french' },
  { value: '클래식 구움과자', labelKey: 'baked' },
  { value: '모던 타르트', labelKey: 'tart' },
] as const;

/** 'All'은 필터 해제를 뜻하는 sentinel — DB 값이 아니다. */
export const ALL_CATEGORIES = 'All';

export const CATEGORY_FILTER_VALUES: string[] = [
  ALL_CATEGORIES,
  ...COURSE_CATEGORIES.map((c) => c.value),
];

/** 저장된 값 → 라벨 키. 알 수 없는 값이면 undefined(호출부가 원문을 그대로 보여준다). */
export function courseCategoryLabelKey(value: string): string | undefined {
  return COURSE_CATEGORIES.find((c) => c.value === value)?.labelKey;
}
