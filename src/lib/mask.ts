/**
 * 이메일 부분 마스킹 (TS-SEC-04): `john@example.com` → `j***@e***`.
 * 워터마크 오버레이에 노출되므로 개인정보 전체 노출을 막되 유출원 추적은 가능하게 한다.
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return 'user***';
  const l = local[0] ?? '*';
  const d = domain[0] ?? '*';
  return `${l}***@${d}***`;
}
