import { describe, expect, it } from 'vitest';

import { packageConfigDirs } from './config-dir.util.ts';

const DROPPED_DIRS = ['', '.', './', '..', '../x', 'a/../../b', '/abs', 'C:/x', 'c:x', './C:/x'];

const KEPT_DIRS: [string, string][] = [
  ['..foo', '..foo'],
  ['pkgs/a:b', 'pkgs/a:b'],
  ['a/../b', 'b'],
  ['./a/', 'a']
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
});
