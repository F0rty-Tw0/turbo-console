import { describe, expect, it } from 'vitest';

// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '.' this rule asks for.
import { PACKAGE_NAME } from './index.ts';

describe('FEATURE: graph-ui package entry', () => {
  describe('GIVEN the package entry point', () => {
    it('WHEN PACKAGE_NAME is read THEN it equals the package name', () => {
      expect(PACKAGE_NAME).toBe('@turbo-console/graph-ui');
    });
  });
});
