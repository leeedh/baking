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

/** Mux 관리 API 클라이언트 획득(env 미설정 시 throw). 업로드·자산 조회용. */
function getMuxClient(): Mux {
  const env = getMuxEnv();
  if (!env) {
    throw new Error('Mux 환경변수가 설정되지 않았습니다 (.env.local 의 MUX_* 참조).');
  }
  if (!muxClient) {
    muxClient = new Mux({ tokenId: env.tokenId, tokenSecret: env.tokenSecret });
  }
  return muxClient;
}

/**
 * 브라우저 직접 업로드용 Direct Upload를 생성한다(운영자 전용, 관리 API 키 사용).
 * 자산은 signed 재생 정책으로 생성 → 재생은 계속 서명 토큰(signPlaybackToken)으로만 가능.
 */
export async function createDirectUpload(
  corsOrigin: string,
): Promise<{ uploadId: string; uploadUrl: string }> {
  const mux = getMuxClient();
  const upload = await mux.video.uploads.create({
    cors_origin: corsOrigin,
    new_asset_settings: { playback_policy: ['signed'] },
  });
  return { uploadId: upload.id, uploadUrl: upload.url };
}

export type MuxUploadState = 'waiting' | 'preparing' | 'ready' | 'errored';

/**
 * Direct Upload → Asset 진행 상태를 조회한다. 인코딩이 끝나 재생 준비되면
 * assetId·(signed) playbackId를 반환한다. 아직이면 playbackId는 null.
 */
export async function getUploadResult(
  uploadId: string,
): Promise<{ state: MuxUploadState; assetId: string | null; playbackId: string | null }> {
  const mux = getMuxClient();
  const upload = await mux.video.uploads.retrieve(uploadId);

  if (upload.status === 'errored') return { state: 'errored', assetId: null, playbackId: null };
  if (!upload.asset_id) return { state: 'waiting', assetId: null, playbackId: null };

  const asset = await mux.video.assets.retrieve(upload.asset_id);
  if (asset.status === 'errored') {
    return { state: 'errored', assetId: upload.asset_id, playbackId: null };
  }
  if (asset.status !== 'ready') {
    return { state: 'preparing', assetId: upload.asset_id, playbackId: null };
  }

  const signed = asset.playback_ids?.find((p) => p.policy === 'signed');
  const playbackId = signed?.id ?? asset.playback_ids?.[0]?.id ?? null;
  return { state: 'ready', assetId: upload.asset_id, playbackId };
}

/**
 * 특정 playbackId에 대한 Mux 단기 서명 재생 JWT를 발급한다.
 * 수강권 확인은 호출부(POST /api/playback/token)에서 선행한다 — 이 함수는 순수 서명만 담당.
 * Mux env 미설정 시 throw → 호출부에서 503으로 변환.
 */
export async function signPlaybackToken(
  playbackId: string,
  expiration = `${PLAYBACK_TOKEN_FALLBACK_TTL_SEC}s`,
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
