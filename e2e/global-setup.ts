import { createClient } from '@supabase/supabase-js';
import { E2E_EMAIL, E2E_PASSWORD, loadEnvLocal, requireEnv } from './env';

/**
 * E2E 계정을 멱등하게 준비한다. 이미 있으면 비밀번호만 맞춘다.
 * service_role을 쓰므로 테스트 실행 환경(로컬·CI)에만 존재해야 한다.
 */
export default async function globalSetup(): Promise<void> {
  loadEnvLocal();
  const admin = createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } },
  );

  const { data: created, error } = await admin.auth.admin.createUser({
    email: E2E_EMAIL,
    password: E2E_PASSWORD,
    email_confirm: true,
    user_metadata: { name: 'E2E 학생' },
  });

  if (created?.user) return;

  // 이미 존재하는 계정 — 비밀번호가 드리프트했을 수 있으니 다시 맞춘다.
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  const existing = list.users.find((u) => u.email === E2E_EMAIL);
  if (!existing) throw error ?? new Error(`E2E 계정을 준비하지 못했습니다: ${E2E_EMAIL}`);

  const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
    password: E2E_PASSWORD,
    email_confirm: true,
  });
  if (updateError) throw updateError;
}
