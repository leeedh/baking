import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Playwright는 Next와 달리 `.env.local`을 자동으로 읽지 않는다.
 * 의존성을 늘리지 않으려고 필요한 키만 직접 파싱한다(따옴표·주석·빈 줄 처리).
 */
export function loadEnvLocal(): void {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
  } catch {
    return; // CI는 실제 환경변수를 주입한다.
  }
  for (const line of raw.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rest] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rest.trim().replace(/^["']|["']$/g, '');
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`E2E: 환경변수 ${name}이(가) 필요합니다.`);
  return value;
}

/** E2E 전용 계정 — 시드 운영자 계정을 쓰지 않는다(비밀번호를 리포에 두지 않기 위해). */
export const E2E_EMAIL = process.env.E2E_EMAIL ?? 'e2e-student@ateliercreme.test';
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? 'e2e-playwright-pw-1';
