// DC-69 · 커밋 게이트. Biome은 스테이징된 파일에만 적용한다(리포 전체 포맷은 CRLF로 대량 diff).
export default {
  '*.{js,jsx,ts,tsx,mjs,cjs,json,jsonc,css}':
    'biome check --write --no-errors-on-unmatched --files-ignore-unknown=true',
  // tsc는 파일 단위로 돌릴 수 없어 TS가 스테이징됐을 때만 프로젝트 전체를 한 번 검사한다.
  '*.{ts,tsx}': () => 'tsc --noEmit',
};
