import 'server-only';

import Mux from '@mux/mux-node';
import { getMuxEnv } from './env';
import { PLAYBACK_TOKEN_FALLBACK_TTL_SEC } from './ttl';

// 재생 토큰 만료 산정은 './ttl'로 분리했다(단위 테스트 대상 — 이 모듈은 server-only).
export {
  PLAYBACK_TOKEN_FALLBACK_TTL_SEC,
  PLAYBACK_TOKEN_MAX_TTL_SEC,
  PLAYBACK_TOKEN_MIN_TTL_SEC,
  playbackTokenTtlSec,
} from './ttl';

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

  // signed 정책 ID만 받는다(코드리뷰 M-5). 예전엔 없으면 첫 playback ID로 폴백했는데,
  // public ID가 저장되면 서명 JWT 없이 재생 가능한 차시가 조용히 생겨 재생 토큰 라우트의
  // 이중 방어가 통째로 무의미해진다. 업로드를 playback_policy:['signed']로 만들므로
  // 정상 경로에선 항상 존재한다 — 없다면 비정상이므로 fail-closed로 errored 처리한다
  // ('ready' + playbackId:null로 두면 폴링만 멈추고 운영자에게 신호가 남지 않는다).
  const signed = asset.playback_ids?.find((p) => p.policy === 'signed');
  if (!signed) {
    console.error(
      `[mux] asset ${upload.asset_id} is ready but has no signed playback ID — 저장을 거부한다.`,
    );
    return { state: 'errored', assetId: upload.asset_id, playbackId: null };
  }
  return { state: 'ready', assetId: upload.asset_id, playbackId: signed.id };
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
