/**
 * 미리보기 차시 자동 지정 판정.
 *
 * 상세 화면은 "1차시 무료 미리보기"를 약속하는데, 업로드로 만든 차시는 `is_preview` 기본값이
 * false다. 그래서 운영자가 손으로 켜지 않으면 **아무도 볼 수 없는 클래스가 팔린다**.
 *
 * 그렇다고 매번 첫 차시를 켜면 안 된다 — 운영자가 일부러 끈 것을 배치를 저장할 때마다
 * 되살리게 된다. 그래서 조건은 하나다: **이 클래스에 미리보기가 하나도 없을 때만** 첫 차시를 켠다.
 *
 * 보관함(chapter_index 0)은 아직 커리큘럼이 아니므로 호출부에서 제외한 목록을 넘긴다.
 */
export function pickAutoPreviewLessonId(
  orderedLessonIds: readonly string[],
  currentPreviewIds: readonly string[],
): string | null {
  if (currentPreviewIds.length > 0) return null;
  return orderedLessonIds[0] ?? null;
}
