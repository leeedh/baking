// 차시 재생시간 산정 — Mux asset.duration(초, 소수) → lessons.duration_sec(정수).
//
// 예전엔 운영자가 "재생시간(분)"을 손으로 입력했다. Mux가 인코딩을 마치면 정확한 길이를
// 이미 알려주는데도 그 값을 버리고 있었고, 오타가 그대로 카탈로그의 총 재생시간
// (course_catalog.duration_sec 합계)으로 나갔다. 이제 인코딩 완료 시 자동 기록한다.
//
// client.ts는 'server-only'라 단위 테스트에서 import할 수 없어, 판정만 이 순수 모듈로 뺐다
// (ttl.ts와 같은 이유 — 코드리뷰 X-5).

/**
 * Mux가 준 duration(초)을 저장 가능한 정수 초로 바꾼다.
 * 값이 없거나 비정상(NaN·Infinity·0 이하)이면 null — 호출부는 null일 때 기존 값을 덮지 않는다.
 */
export function muxDurationToSec(raw: number | null | undefined): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return null;
  // 1초 미만 클립도 0이 아니라 1초로 남긴다 — 0은 "미상"과 구분되지 않는다.
  return Math.max(1, Math.round(raw));
}
