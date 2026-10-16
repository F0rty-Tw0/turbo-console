import { describe, expect, it } from 'vitest';

import { isLockfileName } from './lockfile-name.util.ts';

const LOCKFILES = ['pnpm-lock.yaml', 'bun.lock', 'bun.lockb', 'yarn.lock', 'package-lock.json'];

const OTHER_NAMES = ['pnpm-lock.yml', 'package.json', ''];

describe('FEATURE: lockfile name check', () => {
  describe('GIVEN a lockfile turbo supports', () => {
    it.each(LOCKFILES)('WHEN %j is checked THEN it is a lockfile name', (name) => {
      expect(isLockfileName(name)).toBe(true);
    });
  });

  describe('GIVEN any other name', () => {
    it.each(OTHER_NAMES)('WHEN %j is checked THEN it is no lockfile name', (name) => {
      expect(isLockfileName(name)).toBe(false);
    });
  });
});
