import { describe, expect, it } from 'vitest';

import { isCount, isManifestLine } from './number.util.ts';
import { MANIFEST_LINE_MAX } from '../common/graph-message.const.ts';

describe('FEATURE: isCount', () => {
  it.each([
    { kind: 'zero', value: 0 },
    { kind: 'a whole number', value: 7 },
    { kind: 'the highest safe integer', value: Number.MAX_SAFE_INTEGER },
    { kind: 'one past the manifest line max', value: MANIFEST_LINE_MAX + 1 }
  ])('GIVEN $kind WHEN checked THEN it is a count', ({ value }) => {
    expect(isCount(value)).toBe(true);
  });

  it.each([
    { kind: 'minus one', value: -1 },
    { kind: 'a fraction', value: 1.5 },
    { kind: 'NaN', value: NaN },
    { kind: 'Infinity', value: Infinity },
    { kind: '2 ** 53, past the safe integers', value: 2 ** 53 },
    { kind: 'a number as text', value: '3' },
    { kind: 'null', value: null }
  ])('GIVEN $kind WHEN checked THEN it is not a count', ({ value }) => {
    expect(isCount(value)).toBe(false);
  });
});

describe('FEATURE: isManifestLine', () => {
  it.each([
    { kind: 'zero', value: 0 },
    { kind: 'the manifest line max', value: MANIFEST_LINE_MAX }
  ])('GIVEN $kind WHEN checked THEN it is a manifest line', ({ value }) => {
    expect(isManifestLine(value)).toBe(true);
  });

  it.each([
    { kind: 'one past the manifest line max', value: MANIFEST_LINE_MAX + 1 },
    { kind: 'minus one', value: -1 },
    { kind: 'a fraction', value: 1.5 },
    { kind: 'NaN', value: NaN },
    { kind: 'Infinity', value: Infinity },
    { kind: '2 ** 53, past the safe integers', value: 2 ** 53 },
    { kind: 'a number as text', value: '3' }
  ])('GIVEN $kind WHEN checked THEN it is not a manifest line', ({ value }) => {
    expect(isManifestLine(value)).toBe(false);
  });
});
