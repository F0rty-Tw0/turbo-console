import { describe, expect, it } from 'vitest';

import { isShortString, isString } from './string.util.ts';

describe('FEATURE: isString', () => {
  it.each([
    { kind: 'a word', value: 'state' },
    { kind: 'an empty string', value: '' }
  ])('GIVEN $kind WHEN checked THEN it is a string', ({ value }) => {
    expect(isString(value)).toBe(true);
  });

  it.each([
    { kind: 'null', value: null },
    { kind: 'undefined', value: undefined },
    { kind: 'a number', value: 1 },
    { kind: 'a string array', value: ['a'] }
  ])('GIVEN $kind WHEN checked THEN it is not a string', ({ value }) => {
    expect(isString(value)).toBe(false);
  });
});

describe('FEATURE: isShortString', () => {
  it.each([
    { kind: 'a string of the max length', value: 'abc' },
    { kind: 'an empty string', value: '' }
  ])('GIVEN $kind WHEN checked against a max of 3 THEN it is short', ({ value }) => {
    expect(isShortString(value, 3)).toBe(true);
  });

  it.each([
    { kind: 'a string one past the max', value: 'abcd' },
    { kind: 'a number', value: 1 }
  ])('GIVEN $kind WHEN checked against a max of 3 THEN it is not short', ({ value }) => {
    expect(isShortString(value, 3)).toBe(false);
  });
});
