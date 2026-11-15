import { describe, expect, it } from 'vitest';

import { PACKAGE_NAME } from './index.ts';

describe('FEATURE: repo-gen package entry', () => {
  describe('GIVEN the package entry point', () => {
    it('WHEN PACKAGE_NAME is read THEN it equals the package name', () => {
      expect(PACKAGE_NAME).toBe('@turbo-console/repo-gen');
    });
  });
});
