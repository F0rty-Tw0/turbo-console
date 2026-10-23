import { describe, expect, it } from 'vitest';

import { isString } from './string.util.ts';

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
