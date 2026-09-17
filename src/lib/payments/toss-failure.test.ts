import { describe, expect, it } from 'vitest';
import { tossFailureAction, tossFailureKind } from './toss-failure';

describe('tossFailureKind', () => {
  it.each([
    ['PAY_PROCESS_CANCELED', 'canceled'],
    ['NOT_FOUND_PAYMENT_SESSION', 'sessionExpired'],
    ['REJECT_CARD_COMPANY', 'cardRejected'],
    ['REJECT_CARD_PAYMENT', 'limitExceeded'],
    ['EXCEED_MAX_AUTH_COUNT', 'authFailed'],
    ['PAY_PROCESS_ABORTED', 'network'],
    ['UNAUTHORIZED_KEY', 'config'],
  ])('%s → %s', (code, kind) => {
    expect(tossFailureKind(code)).toBe(kind);
  });

  it('목록에 없는 인증 계열 코드는 이름 규칙으로 authFailed가 된다', () => {
    expect(tossFailureKind('FAILED_3DS_AUTHENTICATION')).toBe('authFailed');
    expect(tossFailureKind('INVALID_CARD_AUTH_REQUEST')).toBe('authFailed');
  });

  it('모르는 코드·빈 값은 unknown으로 폴백한다', () => {
    expect(tossFailureKind('SOMETHING_NEW')).toBe('unknown');
    expect(tossFailureKind(null)).toBe('unknown');
    expect(tossFailureKind('')).toBe('unknown');
  });

  it('AUTH가 단어 일부일 뿐인 코드는 인증 실패로 오분류하지 않는다', () => {
    expect(tossFailureKind('UNAUTHORIZED_SOMETHING')).toBe('unknown');
  });
});

describe('tossFailureAction', () => {
  it('카드·한도·인증 문제는 다른 결제수단을 권한다', () => {
    expect(tossFailureAction('cardRejected')).toBe('otherMethod');
    expect(tossFailureAction('limitExceeded')).toBe('otherMethod');
    expect(tossFailureAction('authFailed')).toBe('otherMethod');
  });

  it('설정 문제는 고객이 해결할 수 없으니 문의로 보낸다', () => {
    expect(tossFailureAction('config')).toBe('contact');
  });

  it('취소·만료·일시 오류·미분류는 다시 시도', () => {
    for (const k of ['canceled', 'sessionExpired', 'network', 'unknown'] as const) {
      expect(tossFailureAction(k)).toBe('retry');
    }
  });
});
