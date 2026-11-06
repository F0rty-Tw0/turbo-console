import { describe, expect, it } from 'vitest';

import { isSourceName, isWalkedDirName } from './import-walk.util.ts';

describe('FEATURE: walk name rules', () => {
  describe('GIVEN a file name', () => {
    it.each(['a.ts', 'a.tsx', 'a.mts', 'a.cts', 'a.js', 'a.jsx', 'a.mjs', 'a.cjs', '.eslintrc.cjs', 'a.spec.ts', 'a.d.tsx'])(
      'WHEN %j is checked THEN it is a source file',
      (name) => {
        const actual = isSourceName(name);

        expect(actual).toBe(true);
      }
    );

    it.each(['a.d.ts', 'a.d.mts', 'a.d.cts', 'a.json', 'a.ts.map', 'a.TS', 'ts', 'a.vue'])(
      'WHEN %j is checked THEN it is not a source file',
      (name) => {
        const actual = isSourceName(name);

        expect(actual).toBe(false);
      }
    );
  });

  describe('GIVEN a directory name', () => {
    it.each([
      ['node_modules', true, false],
      ['node_modules', false, false],
      ['.git', true, false],
      ['.cache', false, false],
      ['dist', true, false],
      ['build', true, false],
      ['out', true, false],
      ['coverage', true, false],
      ['storybook-static', true, false],
      ['dist', false, true],
      ['build', false, true],
      ['src', true, true],
      ['generated', true, true],
      ['lib', true, true]
    ])('WHEN %j is checked at top %s THEN walked is %s', (name, isTop, expected) => {
      const actual = isWalkedDirName(name, isTop);

      expect(actual).toBe(expected);
    });
  });
});
