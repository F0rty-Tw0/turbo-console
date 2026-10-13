import { describe, expect, it } from 'vitest';

import { normalDir, toPosixPath } from './posix-path.util.ts';

const NORMAL_DIRS: [string, string][] = [
  ['./a', 'a'],
  ['a/./b', 'a/b'],
  ['a/b/', 'a/b'],
  ['', '.'],
  ['./', '.'],
  ['/', '/'],
  ['a/../../b', '../b']
];

describe('FEATURE: posix paths', () => {
  describe('GIVEN a Windows-style relative path', () => {
    it('WHEN converted THEN every backslash becomes a slash', () => {
      const path = toPosixPath('a\\b\\c');

      expect(path).toBe('a/b/c');
    });
  });

  describe('GIVEN a posix relative path', () => {
    it('WHEN converted THEN it is unchanged', () => {
      const path = toPosixPath('a/b');

      expect(path).toBe('a/b');
    });
  });

  describe('GIVEN a posix directory', () => {
    it.each(NORMAL_DIRS)('WHEN %s is normalized THEN it is %s', (dir, expected) => {
      const normal = normalDir(dir);

      expect(normal).toBe(expected);
    });
  });
});
