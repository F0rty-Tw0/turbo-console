import { describe, expect, it } from 'vitest';

import { isInsideRoot, packageConfigDirs } from './config-dir.util.ts';

const DROPPED_DIRS = ['', '.', './', '..', '../x', 'a/../../b', '/abs', 'C:/x', 'c:x', './C:/x'];

const OUTSIDE_PATHS = ['..', '../x', 'a/../../x', '/etc/x', 'C:/x', 'c:x', '..\\x', 'a\\..\\..\\x', '\\\\server\\share\\x'];

const INSIDE_PATHS = ['package.json', 'apps/web/turbo.json', '..foo/package.json', 'a/../b/package.json', 'apps\\web\\package.json'];

const KEPT_DIRS: [string, string][] = [
  ['..foo', '..foo'],
  ['pkgs/a:b', 'pkgs/a:b'],
  ['a/../b', 'b'],
  ['./a/', 'a'],
  ['a\\b', 'a/b']
];

describe('FEATURE: package config dirs', () => {
  describe('GIVEN a dir that is the root, absolute or above the root', () => {
    it.each(DROPPED_DIRS)('WHEN %j is listed THEN it is dropped', (dir) => {
      const dirs = packageConfigDirs([dir]);

      expect(dirs).toStrictEqual([]);
    });
  });

  describe('GIVEN a dir inside the root', () => {
    it.each(KEPT_DIRS)('WHEN %s is listed THEN it is kept as %s', (dir, expected) => {
      const dirs = packageConfigDirs([dir]);

      expect(dirs).toStrictEqual([expected]);
    });
  });

  describe('GIVEN dirs that normalize to the same dir', () => {
    it('WHEN they are listed THEN each dir is kept once, in first-seen order', () => {
      const dirs = packageConfigDirs(['./a', 'a', 'a/./b', 'a/b/']);

      expect(dirs).toStrictEqual(['a', 'a/b']);
    });
  });

  describe('GIVEN a path that leaves the root once normalized', () => {
    it.each(OUTSIDE_PATHS)('WHEN %j is checked THEN it is outside the root', (path) => {
      const isInside = isInsideRoot(path);

      expect(isInside).toBe(false);
    });
  });

  describe('GIVEN a path that stays inside the root once normalized', () => {
    it.each(INSIDE_PATHS)('WHEN %j is checked THEN it is inside the root', (path) => {
      const isInside = isInsideRoot(path);

      expect(isInside).toBe(true);
    });
  });
});
