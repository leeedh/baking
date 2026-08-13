/**
 * 업로드 파일명을 Storage 키로 안전하게 바꾼다.
 *
 * 예전에는 허용 문자가 아닌 것을 전부 '-' 한 개씩으로 치환해서, 한글 파일명이
 * `--------.png`처럼 대시 덩어리로 남았다("실습 참고서.png" → 글자 수만큼 대시).
 * 저장소에서 원본을 알아볼 수 없을 바에는 차라리 `cover.png`가 낫다.
 *
 * ASCII만 남기는 것은 의도다 — Supabase Storage의 키 검증이 어떤 유니코드를 받아주는지
 * 문서가 확정적이지 않아, 업로드가 통째로 실패하는 위험을 감수하지 않는다. 대신 호출부는
 * 키 앞에 UUID를 붙이므로 이름이 겹쳐도 충돌하지 않는다.
 */
export function safeStorageName(name: string, ext: string, fallback: string): string {
  const base = name
    .replace(/\.[^.]+$/, '') // 확장자는 실제 형식(ext)으로 다시 붙인다.
    .replace(/[^a-zA-Z0-9._-]+/g, '-') // 연속된 비허용 문자는 대시 하나로 접는다.
    .replace(/^[-._]+|[-._]+$/g, '') // 앞뒤 구분자는 잘라낸다(숨김 파일·확장자 오인 방지).
    .slice(0, 60)
    .replace(/[-._]+$/, ''); // 60자에서 잘린 끝이 구분자로 끝나지 않게.

  return `${base || fallback}.${ext}`;
}
