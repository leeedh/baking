import 'server-only';

/**
 * Supabase 조회 결과에서 데이터를 꺼내되, **조회 실패를 삼키지 않는다**(코드리뷰 X-2).
 *
 * 기존에는 데이터 접근 함수 대부분이 `const { data } = await ...` 형태라 DB 장애나
 * 정책 변경으로 쿼리가 실패해도 화면은 "데이터 없음"으로 정상 렌더됐다.
 * 특히 학습 페이지는 `purchased:false`로 떨어져 **구매자가 접근 거부 화면을 봤고**,
 * 운영자가 알아챌 신호도 남지 않았다.
 *
 * RSC에서 throw하면 `[locale]/error.tsx` 경계가 받아 사용자에게는 오류 화면을,
 * 서버 로그에는 원인을 남긴다 — 조용한 오작동보다 낫다.
 *
 * `single()`이 행을 못 찾을 때 내는 PGRST116은 실패가 아니라 "없음"이므로 null로 돌려준다
 * (`notFound()` 경로를 깨지 않기 위함). `maybeSingle()`은 애초에 이 코드를 내지 않는다.
 */
export function unwrap<T>(
  // error가 없는 형태(로그인 전 분기의 Promise.resolve({ data: ... }))도 그대로 받는다.
  result: { data: T; error?: { message: string; code?: string } | null },
  context: string,
): T {
  if (result.error) {
    if (result.error.code === 'PGRST116') return null as T;
    throw new Error(`${context} 조회 실패: ${result.error.message}`);
  }
  return result.data;
}
