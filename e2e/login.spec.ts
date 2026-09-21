import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD } from './env';

// 문구는 메시지 카탈로그에서 가져온다 — 카피가 바뀌어도 테스트가 흔들리지 않는다.
// (import attribute 없이 JSON을 import할 수 없어 파일에서 읽는다.)
const messages = JSON.parse(readFileSync(resolve('messages/ko.json'), 'utf8')) as {
  login: { errInvalidCredentials: string };
  nav: { myclasses: string; logout: string };
};

async function submitLogin(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/ko/login');
  await page.locator('#input-email').fill(email);
  await page.locator('#input-password').fill(password);
  await page.locator('#btn-auth-submit').click();
}

test('로그인 후 카탈로그와 내 클래스에 진입한다', async ({ page }) => {
  await submitLogin(page, E2E_EMAIL, E2E_PASSWORD);

  // 로그인 성공 시 홈으로 이동하고 헤더가 로그인 상태로 바뀐다.
  await expect(page).toHaveURL(/\/ko\/?$/);
  await expect(page.getByRole('link', { name: messages.nav.myclasses }).first()).toBeVisible();

  // 카탈로그 카드는 링크가 아니라 클릭 핸들러로 이동한다(ClassCard).
  await page.goto('/ko/classes');
  await page.getByRole('heading', { level: 3 }).getByRole('button').first().click();
  await expect(page).toHaveURL(/\/ko\/classes\/[\w-]+$/);

  // 인증 가드가 있는 페이지 — 세션이 없으면 /ko/login으로 리다이렉트된다.
  await page.goto('/ko/my-classes');
  await expect(page).toHaveURL(/\/ko\/my-classes$/);
});

test('잘못된 비밀번호는 오류를 표시하고 로그인 페이지에 머문다', async ({ page }) => {
  await submitLogin(page, E2E_EMAIL, 'wrong-password-999');

  await expect(page.getByText(messages.login.errInvalidCredentials)).toBeVisible();
  await expect(page).toHaveURL(/\/ko\/login$/);
});

test('비로그인 상태로 내 클래스에 접근하면 로그인으로 보낸다', async ({ page }) => {
  await page.goto('/ko/my-classes');
  await expect(page).toHaveURL(/\/ko\/login$/);
});
