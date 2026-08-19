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

/**
 * 웹훅 서명 검증용 시크릿 (DC-111).
 *
 * getMuxEnv()와 **일부러 분리한다.** 그쪽은 하나라도 없으면 통째로 null을 반환하는
 * all-or-nothing 구조라, 여기에 끼워 넣으면 웹훅 시크릿이 비어 있는 순간 재생 토큰
 * 서명까지 죽는다 — 웹훅은 안 받아도 재생은 되어야 한다.
 */
export function getMuxWebhookSecret(): string | null {
  return process.env.MUX_WEBHOOK_SECRET || null;
}
