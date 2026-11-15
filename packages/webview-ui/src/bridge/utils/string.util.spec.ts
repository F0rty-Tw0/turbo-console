import { describe, expect, it } from 'vitest';

import { isShortString, isString } from './string.util.ts';

describe('FEATURE: string guards', () => {
  describe.each([
    { kind: 'a word', value: 'state' },
    { kind: 'an empty string', value: '' }
  ])('GIVEN $kind', ({ value }) => {
    it('WHEN checked THEN it is a string', () => {
      expect(isString(value)).toBe(true);
    });
  });

  describe.each([
    { kind: 'null', value: null },
    { kind: 'undefined', value: undefined },
    { kind: 'a number', value: 1 },
    { kind: 'a string array', value: ['a'] }
  ])('GIVEN $kind', ({ value }) => {
    it('WHEN checked THEN it is not a string', () => {
      expect(isString(value)).toBe(false);
    });
  });

  describe.each([
    { kind: 'a string of the max length', value: 'abc' },
    { kind: 'an empty string', value: '' }
  ])('GIVEN $kind', ({ value }) => {
    it('WHEN checked against a max of 3 THEN it is short', () => {
      expect(isShortString(value, 3)).toBe(true);
    });
  });

  describe.each([
    { kind: 'a string one past the max', value: 'abcd' },
    { kind: 'a number', value: 1 }
  ])('GIVEN $kind', ({ value }) => {
    it('WHEN checked against a max of 3 THEN it is not short', () => {
      expect(isShortString(value, 3)).toBe(false);
    });
  });
});
