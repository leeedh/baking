import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import ko from '../../../messages/ko.json';
import { TOSS_FAILURE_KINDS } from '../payments/toss-failure';
import { PROBLEM_MESSAGE_KEYS, parseProblem, problemMessageKey } from './problem-client';
import { PROBLEM_TYPE_BASE } from './problem-type-base';

const body = (slug: string, extra: Record<string, unknown> = {}) => ({
  type: `${PROBLEM_TYPE_BASE}${slug}`,
  title: 't',
  status: 400,
  detail: '한국어 detail',
  ...extra,
});

describe('parseProblem', () => {
  it('type URI에서 슬러그를 뽑는다', () => {
    expect(parseProblem(body('amount-mismatch'))).toEqual({
      slug: 'amount-mismatch',
      tossKind: null,
    });
  });

  it('Toss 승인 실패는 code로 kind를 붙인다', () => {
    expect(
      parseProblem(body('toss-confirm-failed', { code: 'REJECT_CARD_PAYMENT' })).tossKind,
    ).toBe('limitExceeded');
    expect(parseProblem(body('toss-confirm-failed')).tossKind).toBe('unknown');
  });

  it('Problem 형식이 아닌 입력에도 던지지 않는다', () => {
    for (const v of [null, undefined, 'x', 42, {}, { type: 'https://evil.example/errors/x' }]) {
      expect(parseProblem(v)).toEqual({ slug: null, tossKind: null });
    }
  });
});

describe('problemMessageKey', () => {
  it('매핑된 type은 errors 키로', () => {
    expect(problemMessageKey(parseProblem(body('already-enrolled')))).toBe('alreadyEnrolled');
  });

  it('Toss 실패는 toss.<kind>', () => {
    expect(
      problemMessageKey(parseProblem(body('toss-confirm-failed', { code: 'USER_CANCEL' }))),
    ).toBe('toss.canceled');
  });

  it('매핑되지 않은 type은 null — 호출부가 일반 안내로 폴백한다', () => {
    expect(problemMessageKey(parseProblem(body('signed-url-failed')))).toBeNull();
    expect(problemMessageKey(parseProblem(null))).toBeNull();
  });
});

// 매핑이 가리키는 키가 카탈로그에 실제로 있어야 /en에서 키 문자열이 노출되지 않는다.
describe('errors 네임스페이스가 매핑을 모두 덮는다', () => {
  const need = [
    ...PROBLEM_MESSAGE_KEYS,
    ...TOSS_FAILURE_KINDS.map((k) => `toss.${k}`),
    'generic',
    'network',
  ];
  const lookup = (root: unknown, key: string) =>
    key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], root);

  it.each([
    ['ko', ko],
    ['en', en],
  ])('%s', (_, messages) => {
    const errors = (messages as Record<string, unknown>).errors;
    expect(need.filter((k) => typeof lookup(errors, k) !== 'string')).toEqual([]);
  });
});
