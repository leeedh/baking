/**
 * Mux 서버 전용 환경변수 조회 (TS-SEC-08).
 * 미설정이면 null을 반환해 호출부(재생 토큰 API)에서 503으로 분기한다.
 * 절대 NEXT_PUBLIC_ 로 노출하지 말 것 — 서명 키가 유출되면 무단 재생 토큰 발급이 가능해진다.
 */
export function getMuxEnv(): {
  tokenId: string;
  tokenSecret: string;
  signingKeyId: string;
  signingPrivateKey: string;
} | null {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  const signingKeyId = process.env.MUX_SIGNING_KEY_ID;
  const signingPrivateKey = process.env.MUX_SIGNING_PRIVATE_KEY;
  if (!tokenId || !tokenSecret || !signingKeyId || !signingPrivateKey) return null;
  return { tokenId, tokenSecret, signingKeyId, signingPrivateKey };
}
