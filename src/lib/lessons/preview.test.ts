import { describe, expect, it } from 'vitest';
import { pickAutoPreviewLessonId } from './preview';

describe('pickAutoPreviewLessonId', () => {
  it('미리보기가 하나도 없으면 첫 차시를 고른다', () => {
    expect(pickAutoPreviewLessonId(['a', 'b', 'c'], [])).toBe('a');
  });

  it('미리보기가 이미 있으면 아무것도 바꾸지 않는다', () => {
    expect(pickAutoPreviewLessonId(['a', 'b', 'c'], ['b'])).toBeNull();
  });

  it('운영자가 첫 차시가 아닌 곳을 미리보기로 정했어도 존중한다', () => {
    // 회귀: 배치를 저장할 때마다 첫 차시를 켜면 운영자의 선택을 매번 덮어쓴다.
    expect(pickAutoPreviewLessonId(['a', 'b'], ['b'])).toBeNull();
  });

  it('첫 차시가 이미 미리보기면 다시 켤 일이 없다', () => {
    expect(pickAutoPreviewLessonId(['a', 'b'], ['a'])).toBeNull();
  });

  it('배치된 차시가 없으면(전부 보관함) 고를 것이 없다', () => {
    expect(pickAutoPreviewLessonId([], [])).toBeNull();
  });
});
