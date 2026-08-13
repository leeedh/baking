import { describe, expect, it } from 'vitest';
import { safeStorageName } from './safe-name';

describe('safeStorageName', () => {
  it('평범한 영문 이름은 그대로 두고 확장자만 정정한다', () => {
    expect(safeStorageName('cover-art.jpeg', 'jpg', 'cover')).toBe('cover-art.jpg');
  });

  it('한글만으로 된 이름은 대시 덩어리 대신 기본 이름이 된다', () => {
    // 회귀: 예전엔 글자 수만큼 대시가 남아 `--------.png`가 됐다.
    expect(safeStorageName('실습 참고서.png', 'png', 'cover')).toBe('cover.png');
  });

  it('한글과 영문이 섞이면 영문 부분은 살린다', () => {
    expect(safeStorageName('1강 madeleine 완성본.mp4.pdf', 'pdf', 'material')).toBe(
      '1-madeleine-.mp4.pdf',
    );
  });

  it('연속된 공백·특수문자를 대시 하나로 접는다', () => {
    expect(safeStorageName('a   !!!   b.png', 'png', 'cover')).toBe('a-b.png');
  });

  it('앞뒤 구분자를 잘라낸다 — 숨김 파일이나 빈 이름으로 보이지 않게', () => {
    expect(safeStorageName('...hidden...png', 'png', 'cover')).toBe('hidden.png');
    expect(safeStorageName('---.pdf', 'pdf', 'material')).toBe('material.pdf');
  });

  it('경로 문자를 남기지 않는다(키 탈출 방지)', () => {
    expect(safeStorageName('../../etc/passwd.png', 'png', 'cover')).toBe('etc-passwd.png');
  });

  it('60자로 자르되 잘린 끝이 구분자로 끝나지 않는다', () => {
    const long = `${'a'.repeat(59)}   tail.png`;
    const out = safeStorageName(long, 'png', 'cover');
    expect(out).toBe(`${'a'.repeat(59)}.png`);
    expect(out.length).toBeLessThanOrEqual(64);
  });

  it('확장자가 없어도 형식 확장자를 붙인다', () => {
    expect(safeStorageName('scan', 'pdf', 'material')).toBe('scan.pdf');
  });

  it('이름이 비어 있으면 기본 이름을 쓴다', () => {
    expect(safeStorageName('', 'png', 'cover')).toBe('cover.png');
  });
});
