import { describe, expect, it } from 'vitest';

import { isRecord } from './record.util.ts';

const PLAIN = { a: 1 };

describe('FEATURE: isRecord', () => {
  describe.each([
    { kind: 'a plain object', value: PLAIN },
    { kind: 'an empty object', value: {} },
    { kind: 'an array', value: [] }
  ])('GIVEN $kind', ({ value }) => {
    it('WHEN checked THEN it is a record', () => {
      expect(isRecord(value)).toBe(true);
    });
  });

  describe.each([
    { kind: 'null', value: null },
    { kind: 'undefined', value: undefined },
    { kind: 'a string', value: 'state' },
    { kind: 'a number', value: 1 }
  ])('GIVEN $kind', ({ value }) => {
    it('WHEN checked THEN it is not a record', () => {
      expect(isRecord(value)).toBe(false);
    });
  });
});
