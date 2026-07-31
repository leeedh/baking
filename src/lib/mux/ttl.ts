// 재생 토큰 유효기간 정책 (TS-ADR-03: 유출 억제를 위한 만료).
// VOD 특성상 한 번 발급한 토큰으로 차시 전체를 끊김 없이 봐야 하므로, 호출부는 차시
// 길이에 비례한 만료를 산정한다(아래 clamp). 아래 상수는 duration 미상일 때의 폴백·경계값.
//
// Mux SDK와 분리된 순수 모듈이다 — client.ts는 'server-only'라 단위 테스트에서 import할 수
// 없어서, 자동 검증이 필요한 이 판정만 따로 뺐다(코드리뷰 X-5).

/** duration을 알 수 없을 때의 폴백 만료(초). */
export const PLAYBACK_TOKEN_FALLBACK_TTL_SEC = 60 * 60; // 1h
/** 만료 하한(초) — 짧은 차시도 일시정지·이탈 여유 확보. */
export const PLAYBACK_TOKEN_MIN_TTL_SEC = 60 * 60; // 1h
/**
 * 만료 상한(초) — 유출 시 재사용 가능 시간을 제한.
 *
 * Mux 서명 JWT는 발급 후 취소가 불가능해, 상한이 곧 "환불 후에도 시청 가능한 최대 시간"이다.
 * 현재 최장 차시가 42분(=산정값 2.1h)이라 2h 상한이면 모든 차시를 한 번의 발급으로 커버한다
 * → 클라이언트 재발급 로직 불필요. 2시간을 넘는 차시를 등록하게 되면 그때 재생 토큰 API가
 * 반환하는 expiresAt으로 만료 전 재발급하는 훅을 SecureVideoPlayer에 추가할 것.
 */
export const PLAYBACK_TOKEN_MAX_TTL_SEC = 2 * 60 * 60; // 2h

/** 차시 길이(초)로부터 토큰 만료(초)를 산정: 길이의 3배, [1h, 2h]로 clamp. */
export function playbackTokenTtlSec(durationSec: number | null | undefined): number {
  if (!durationSec || durationSec <= 0) return PLAYBACK_TOKEN_FALLBACK_TTL_SEC;
  return Math.min(
    Math.max(durationSec * 3, PLAYBACK_TOKEN_MIN_TTL_SEC),
    PLAYBACK_TOKEN_MAX_TTL_SEC,
  );
}
