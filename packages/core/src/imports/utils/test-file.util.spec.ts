import { describe, expect, it } from 'vitest';

import { isTestFile } from './test-file.util.ts';

describe('FEATURE: test file rule', () => {
  describe('GIVEN package-relative posix paths', () => {
    it.each([
      ['src/a.spec.ts', true],
      ['src/a.test.tsx', true],
      ['src/a.e2e.mts', true],
      ['src/a.bench.cjs', true],
      ['src/a.spec.js', true],
      ['e2e/graph.po.ts', true],
      ['src/test/utils/x.ts', true],
      ['tests/x.ts', true],
      ['src/__tests__/a.ts', true],
      ['src/latest.ts', false],
      ['src/contest/a.ts', false],
      ['src/testing/a.ts', false],
      ['src/a.specs.ts', false],
      ['src/a.spec.json', false],
      ['test.ts', false],
      ['src/e2e.ts', false]
    ])('WHEN %j is checked THEN isTestFile is %s', (path, expected) => {
      expect(isTestFile(path)).toBe(expected);
    });
  });
});
