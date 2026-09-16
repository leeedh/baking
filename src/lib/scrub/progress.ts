/**
 * 스크롤 스크러빙의 순수 매핑 함수들.
 *
 * DOM·타이머·비디오에 의존하지 않는 산수만 모아 둔다. 이 리포 규약대로
 * (CLAUDE.md "테스트 규약") 판정 로직을 순수 모듈로 떼어 내야 콜로케이트
 * 테스트를 붙일 수 있다. 부수효과는 `hooks/useScrollScrub.ts`가 맡는다.
 */

/** 값을 [min, max] 안으로 자른다. */
export function clamp(value: number, min = 0, max = 1): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** from → to 사이를 t(0~1)로 선형 보간한다. */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * 트랙의 뷰포트 기준 위치를 0~1 진행률로 환산한다.
 *
 * `rectTop`이 0이면 트랙 상단이 뷰포트 상단에 막 닿은 순간(진행률 0),
 * 스크롤 예산(`trackHeight - viewportHeight`)만큼 더 내려가면 1이다.
 * 핀(sticky)이 붙어 있는 구간과 정확히 일치한다.
 */
export function scrollProgress(
  rectTop: number,
  trackHeight: number,
  viewportHeight: number,
): number {
  const budget = trackHeight - viewportHeight;
  // 트랙이 뷰포트보다 짧으면 스크럽할 여백이 없다. 시작 상태로 고정한다.
  if (budget <= 0) return 0;
  return clamp(-rectTop / budget);
}

/**
 * 진행률을 재생 위치(초)로 바꾼다.
 *
 * 마지막 프레임에 정확히 닿으면 브라우저가 `ended`로 처리하거나 첫 프레임으로
 * 되감는 경우가 있어, 끝에서 한 프레임(1/24s)을 남긴다.
 */
export function progressToTime(progress: number, duration: number, fps = 24): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  const last = Math.max(0, duration - 1 / fps);
  return clamp(progress) * last;
}

/**
 * 한 비트(카피 한 덩어리)의 불투명도.
 *
 * [start, end] 구간에서 1이고 양 끝에서 `fade`만큼 교차 페이드한다.
 * 첫 비트는 진입 페이드를, 마지막 비트는 퇴장 페이드를 생략해 항상 보이게 둔다.
 */
export function beatOpacity(
  progress: number,
  start: number,
  end: number,
  fade = 0.06,
  options: { fadeIn?: boolean; fadeOut?: boolean } = {},
): number {
  const { fadeIn = true, fadeOut = true } = options;
  const p = clamp(progress);

  if (fadeIn && p < start) return clamp((p - (start - fade)) / fade);
  if (fadeOut && p > end) return clamp((end + fade - p) / fade);
  return 1;
}
