import { describe, expect, it } from 'vitest';

import { toPosixPath } from './posix-path.util.ts';

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
});
