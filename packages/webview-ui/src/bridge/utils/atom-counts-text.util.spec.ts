import { describe, expect, it } from 'vitest';

import { atomCountsText } from './atom-counts-text.util.ts';

describe('FEATURE: atom counts text', () => {
  it.each([
    [{ files: 10, cached: null, failed: null }, '10 files'],
    [{ files: 10, cached: 3, failed: null }, '10 files · 3 cached'],
    [{ files: 10, cached: 3, failed: 1 }, '10 files · 3 cached · 1 failed'],
    [{ files: 10, cached: null, failed: 2 }, '10 files · 2 failed'],
    [{ files: 10, cached: 9, failed: 0 }, '10 files · 9 cached'],
    [{ files: 10, cached: null, failed: 0 }, '10 files'],
    [{ files: 10, cached: 0, failed: null }, '10 files · 0 cached'],
    [{ files: 1, cached: null, failed: null }, '1 files'],
    [{ files: 0, cached: null, failed: null }, '0 files']
  ])('GIVEN counts %j WHEN formatted THEN it reads %s', (counts, expected) => {
    expect(atomCountsText(counts)).toBe(expected);
  });
});
