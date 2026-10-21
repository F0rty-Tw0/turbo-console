import { describe, expect, it } from 'vitest';

import { isRecord } from './record.util.ts';

describe('FEATURE: record check', () => {
  it.each<[string, unknown, boolean]>([
    ['an object', { a: 1 }, true],
    ['an array', [1], false],
    ['null', null, false],
    ['a string', 'x', false]
  ])('GIVEN %s WHEN checked THEN it is %s', (_name, value, expected) => {
    expect(isRecord(value)).toBe(expected);
  });
});
