/**
 * Supabase 공개 환경변수 조회.
 * Vercel에 미설정이면 middleware/클라이언트가 throw하지 않도록 호출부에서 분기한다.
 */
export function getSupabasePublicEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}
