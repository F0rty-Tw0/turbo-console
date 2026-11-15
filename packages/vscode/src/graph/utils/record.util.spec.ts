import { describe, expect, it } from 'vitest';

import { isRecord } from './record.util.ts';

describe('FEATURE: record check', () => {
  describe.each<[string, unknown, boolean]>([
    ['an object', { a: 1 }, true],
    ['an array', [1], false],
    ['null', null, false],
    ['a string', 'x', false]
  ])('GIVEN %s', (_name, value, expected) => {
    it(`WHEN checked THEN it is ${String(expected)}`, () => {
      expect(isRecord(value)).toBe(expected);
    });
  });
});
