import { describe, expect, it } from 'vitest';
import { getTossFailureMessage } from './toss-error-messages';

describe('getTossFailureMessage', () => {
  it('매핑된 코드는 안내 문구로 바꾼다', () => {
    expect(getTossFailureMessage('REJECT_CARD_PAYMENT', 'raw')).toContain('한도초과');
  });

  it('미매핑 코드는 Toss 원문을 그대로 보여준다', () => {
    expect(getTossFailureMessage('UNKNOWN_CODE', '알 수 없는 오류')).toBe('알 수 없는 오류');
  });

  it('코드도 원문도 없으면 기본 문구로 폴백한다', () => {
    expect(getTossFailureMessage(null, null)).toBe('결제가 취소되었거나 승인되지 않았습니다.');
    expect(getTossFailureMessage(undefined, undefined)).toBe(
      '결제가 취소되었거나 승인되지 않았습니다.',
    );
  });
});
