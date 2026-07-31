import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// 로컬 Supabase 스택(Docker)이 없어 DB 통합 테스트는 돌릴 수 없다.
// 그래서 DB·네트워크에 의존하지 않는 **순수 판정 로직**만 자동 검증한다(코드리뷰 X-5).
// 결제 상태 전이·RLS 같은 불변식은 DB 제약과 RPC가 대신 강제한다(20260731010430 마이그레이션).
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
