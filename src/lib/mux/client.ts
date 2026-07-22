import 'server-only';

import Mux from '@mux/mux-node';
import { getMuxEnv } from './env';

// 재생 토큰 유효기간 정책 (TS-ADR-03: 유출 억제를 위한 만료).
// VOD 특성상 한 번 발급한 토큰으로 차시 전체를 끊김 없이 봐야 하므로, 호출부는 차시
// 길이에 비례한 만료를 산정한다(아래 clamp). 아래 상수는 duration 미상일 때의 폴백·경계값.
/** duration을 알 수 없을 때의 폴백 만료(초). */
export const PLAYBACK_TOKEN_FALLBACK_TTL_SEC = 60 * 60; // 1h
/** 만료 하한(초) — 짧은 차시도 일시정지·이탈 여유 확보. */
export const PLAYBACK_TOKEN_MIN_TTL_SEC = 60 * 60; // 1h
/** 만료 상한(초) — 유출 시 재사용 가능 시간을 제한. */
export const PLAYBACK_TOKEN_MAX_TTL_SEC = 12 * 60 * 60; // 12h

/** 차시 길이(초)로부터 토큰 만료(초)를 산정: 길이의 3배, [1h, 12h]로 clamp. */
export function playbackTokenTtlSec(durationSec: number | null | undefined): number {
  if (!durationSec || durationSec <= 0) return PLAYBACK_TOKEN_FALLBACK_TTL_SEC;
  return Math.min(
    Math.max(durationSec * 3, PLAYBACK_TOKEN_MIN_TTL_SEC),
    PLAYBACK_TOKEN_MAX_TTL_SEC,
  );
}

// Mux 클라이언트는 요청마다 재생성하지 않고 모듈 스코프에서 1회만 만든다(키는 정적 env).
let muxClient: Mux | null = null;

/**
 * 특정 playbackId에 대한 Mux 단기 서명 재생 JWT를 발급한다.
 * 수강권 확인은 호출부(POST /api/playback/token)에서 선행한다 — 이 함수는 순수 서명만 담당.
 * Mux env 미설정 시 throw → 호출부에서 503으로 변환.
 */
export async function signPlaybackToken(
  playbackId: string,
  expiration: string = `${PLAYBACK_TOKEN_FALLBACK_TTL_SEC}s`,
): Promise<string> {
  const env = getMuxEnv();
  if (!env) {
    throw new Error('Mux 환경변수가 설정되지 않았습니다 (.env.local 의 MUX_* 참조).');
  }
  if (!muxClient) {
    muxClient = new Mux({ tokenId: env.tokenId, tokenSecret: env.tokenSecret });
  }
  const mux = muxClient;
  return mux.jwt.signPlaybackId(playbackId, {
    type: 'video',
    expiration,
    keyId: env.signingKeyId,
    keySecret: env.signingPrivateKey,
  });
}
