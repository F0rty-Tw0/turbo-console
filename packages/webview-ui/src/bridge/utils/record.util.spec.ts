import { describe, expect, it } from 'vitest';

import { isRecord } from './record.util.ts';

const PLAIN = { a: 1 };

describe('FEATURE: isRecord', () => {
  it.each([
    { kind: 'a plain object', value: PLAIN },
    { kind: 'an empty object', value: {} },
    { kind: 'an array', value: [] }
  ])('GIVEN $kind WHEN checked THEN it is a record', ({ value }) => {
    expect(isRecord(value)).toBe(true);
  });

  it.each([
    { kind: 'null', value: null },
    { kind: 'undefined', value: undefined },
    { kind: 'a string', value: 'state' },
    { kind: 'a number', value: 1 }
  ])('GIVEN $kind WHEN checked THEN it is not a record', ({ value }) => {
    expect(isRecord(value)).toBe(false);
  });
});
