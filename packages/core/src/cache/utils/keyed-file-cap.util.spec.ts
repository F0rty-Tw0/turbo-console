import { describe, expect, it } from 'vitest';

import { keyedFileCapOf } from './keyed-file-cap.util.ts';

const MIB = 1024 * 1024;

describe('FEATURE: keyed file byte cap', () => {
  describe('GIVEN a lockfile name', () => {
    it('WHEN it is a root lockfile THEN its cap is 64 MiB', () => {
      expect(keyedFileCapOf('pnpm-lock.yaml')).toBe(64 * MIB);
    });

    it('WHEN it sits in a package dir THEN its cap is still 64 MiB', () => {
      expect(keyedFileCapOf('apps/web/bun.lockb')).toBe(64 * MIB);
    });
  });

  describe('GIVEN any other keyed file name', () => {
    it('WHEN it is a root config THEN its cap is 4 MiB', () => {
      expect(keyedFileCapOf('.npmrc')).toBe(4 * MIB);
    });

    it('WHEN it is a package manifest THEN its cap is 4 MiB', () => {
      expect(keyedFileCapOf('apps/web/package.json')).toBe(4 * MIB);
    });

    it('WHEN only a parent dir is named like a lockfile THEN its cap is 4 MiB', () => {
      expect(keyedFileCapOf('yarn.lock/turbo.json')).toBe(4 * MIB);
    });
  });
});
