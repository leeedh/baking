import 'server-only';

import Mux from '@mux/mux-node';
import { type MuxAssetLink, pickAssetLinks } from './asset-links';
import { muxDurationToSec } from './duration';
import { getMuxEnv } from './env';
import { PLAYBACK_TOKEN_FALLBACK_TTL_SEC } from './ttl';

// 재생 토큰 만료 산정은 './ttl'로 분리했다(단위 테스트 대상 — 이 모듈은 server-only).
export type { MuxAssetLink };
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
 * Mux 웹훅 서명 검증 (DC-111). 서명이 맞지 않으면 throw 한다.
 *
 * body는 반드시 **원문 문자열**이어야 한다 — JSON으로 파싱했다가 다시 직렬화하면
 * 바이트가 달라져 검증이 깨진다. 그래서 라우트가 request.text()를 먼저 부른다.
 */
export function verifyWebhookSignature(body: string, headers: Headers, secret: string): void {
  getMuxClient().webhooks.verifySignature(body, headers, secret);
}

/**
 * 브라우저 직접 업로드용 Direct Upload를 생성한다(운영자 전용, 관리 API 키 사용).
 * 자산은 signed 재생 정책으로 생성 → 재생은 계속 서명 토큰(signPlaybackToken)으로만 가능.
 *
 * `passthrough`에 차시 id를 새겨 둔다. 예전에는 자산과 차시를 잇는 끈이 **DB에만** 있어서,
 * 완료를 받아 적는 한 번의 기회를 놓치면 Mux에 멀쩡한 영상이 있는데도 어느 차시 것인지
 * 알 길이 없어 되살릴 수 없었다(재업로드 말고는 방법이 없는 상태가 실제로 나왔다).
 * 표식이 자산에 함께 있으면 서버가 언제든 다시 이어 붙일 수 있다.
 */
export async function createDirectUpload(
  corsOrigin: string,
  lessonId: string,
): Promise<{ uploadId: string; uploadUrl: string }> {
  const mux = getMuxClient();
  const upload = await mux.video.uploads.create({
    cors_origin: corsOrigin,
    new_asset_settings: { playback_policy: ['signed'], passthrough: lessonId },
  });
  return { uploadId: upload.id, uploadUrl: upload.url };
}

/**
 * 최근 Mux 자산을 훑어 `passthrough`(=차시 id)로 되짚는다.
 *
 * 브라우저 폴링이 유일한 완료 경로인 구조에서, 폴링이 끊긴 자산을 서버가 스스로 찾아오는
 * 통로다. 저장할 값을 고르는 판정(ready·signed만)은 `pickAssetLinks`에 분리해 테스트한다.
 */
export async function listAssetLinks(limit = 100): Promise<MuxAssetLink[]> {
  const mux = getMuxClient();
  const page = await mux.video.assets.list({ limit });
  return pickAssetLinks(page.data ?? []);
}

export type MuxUploadState = 'waiting' | 'preparing' | 'ready' | 'errored';

export type MuxUploadResult = {
  state: MuxUploadState;
  assetId: string | null;
  playbackId: string | null;
  durationSec: number | null;
  /**
   * errored일 때 운영자에게 그대로 보여줄 한국어 사유.
   *
   * 예전엔 사유가 없어 클라이언트가 "Mux 인코딩에 실패했습니다" 한 줄로 뭉갰다. 그런데
   * 실패 경로는 서로 원인이 완전히 다르다 — 업로드 취소, 제한 시간 초과, 인코딩 실패,
   * 재생 정책 이상. 운영자가 다음에 뭘 해야 할지가 사유마다 달라 구분해 내려보낸다.
   */
  reason?: string;
};

const errored = (assetId: string | null, reason: string): MuxUploadResult => ({
  state: 'errored',
  assetId,
  playbackId: null,
  durationSec: null,
  reason,
});

/**
 * 인코딩이 끝난 자산에서 저장할 값을 뽑는다(업로드 폴링과 복구 라우트가 함께 쓴다).
 *
 * signed 정책 ID만 받는다(코드리뷰 M-5). 예전엔 없으면 첫 playback ID로 폴백했는데,
 * public ID가 저장되면 서명 JWT 없이 재생 가능한 차시가 조용히 생겨 재생 토큰 라우트의
 * 이중 방어가 통째로 무의미해진다. 업로드를 playback_policy:['signed']로 만들므로
 * 정상 경로에선 항상 존재한다 — 없다면 비정상이므로 fail-closed로 errored 처리한다
 * ('ready' + playbackId:null로 두면 폴링만 멈추고 운영자에게 신호가 남지 않는다).
 */
export async function getAssetResult(assetId: string): Promise<MuxUploadResult> {
  const mux = getMuxClient();
  const asset = await mux.video.assets.retrieve(assetId);

  if (asset.status === 'errored') {
    return errored(assetId, 'Mux 인코딩에 실패했습니다. 파일을 확인한 뒤 다시 올려 주세요.');
  }
  if (asset.status !== 'ready') {
    return { state: 'preparing', assetId, playbackId: null, durationSec: null };
  }

  const signed = asset.playback_ids?.find((p) => p.policy === 'signed');
  if (!signed) {
    console.error(`[mux] asset ${assetId} is ready but has no signed playback ID — 저장을 거부한다.`);
    return errored(
      assetId,
      '영상은 준비됐지만 재생 정책이 서명(signed)이 아니어서 저장하지 않았습니다. Mux 설정을 확인해 주세요.',
    );
  }

  const durationSec = muxDurationToSec(asset.duration);
  if (durationSec === null) {
    // 저장 자체는 진행한다(재생은 가능하다) — 다만 조용히 넘어가면 재생시간이 왜 비었는지
    // 아무 데도 남지 않아, 여기서 흔적을 만든다. 복구는 refresh-video 라우트로 다시 시도한다.
    console.warn(`[mux] asset ${assetId} is ready but duration is missing (${asset.duration}).`);
  }

  return { state: 'ready', assetId, playbackId: signed.id, durationSec };
}

/**
 * Direct Upload → Asset 진행 상태를 조회한다. 인코딩이 끝나 재생 준비되면
 * assetId·(signed) playbackId·durationSec을 반환한다. 아직이면 playbackId는 null.
 *
 * durationSec은 Mux가 인코딩 중 측정한 실제 길이다 — 운영자 수기 입력을 대체한다
 * (산정 규칙과 방어는 './duration'의 muxDurationToSec).
 */
export async function getUploadResult(uploadId: string): Promise<MuxUploadResult> {
  const mux = getMuxClient();
  const upload = await mux.video.uploads.retrieve(uploadId);

  // 종료 상태를 errored만으로 보면 cancelled·timed_out이 영원히 'waiting'으로 남는다
  // (그 둘은 asset_id가 없다). 클라이언트는 5분을 헛돌고, mux_upload_id도 지워지지 않아
  // 편집기에 다시 들어올 때마다 죽은 폴링이 되살아난다.
  if (upload.status === 'errored') {
    return errored(null, '업로드가 실패했습니다. 다시 올려 주세요.');
  }
  if (upload.status === 'cancelled') {
    return errored(null, '업로드가 취소되었습니다.');
  }
  if (upload.status === 'timed_out') {
    return errored(null, '업로드 제한 시간이 지났습니다. 다시 올려 주세요.');
  }
  if (!upload.asset_id) {
    return { state: 'waiting', assetId: null, playbackId: null, durationSec: null };
  }

  return getAssetResult(upload.asset_id);
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
