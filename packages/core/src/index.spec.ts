import { PACKAGE_NAME as REPO_GEN } from '@turbo-console/repo-gen';
import { PACKAGE_NAME as TOOLS } from '@turbo-console/tools';
import { describe, expect, it } from 'vitest';

// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '.' this rule asks for.
import { PACKAGE_NAME } from './index.ts';

describe('FEATURE: core package entry', () => {
  describe('GIVEN the package entry point', () => {
    it('WHEN PACKAGE_NAME is read THEN it equals the package name', () => {
      expect(PACKAGE_NAME).toBe('@turbo-console/core');
    });
  });

  describe('GIVEN the built workspace dev dependencies', () => {
    it('WHEN repo-gen PACKAGE_NAME is imported THEN its declaration and value are the exact literal', () => {
      const repoGen: '@turbo-console/repo-gen' = REPO_GEN;
      // @ts-expect-error -- dist/index.d.ts declares the repo-gen literal; an `any` or missing declaration would compile here.
      const mislabelled: '@turbo-console/tools' = REPO_GEN;

      expect(repoGen).toBe('@turbo-console/repo-gen');
      expect(mislabelled).toBe('@turbo-console/repo-gen');
    });

    it('WHEN tools PACKAGE_NAME is imported THEN its declaration and value are the exact literal', () => {
      const tools: '@turbo-console/tools' = TOOLS;
      // @ts-expect-error -- dist/index.d.ts declares the tools literal; an `any` or missing declaration would compile here.
      const mislabelled: '@turbo-console/repo-gen' = TOOLS;

      expect(tools).toBe('@turbo-console/tools');
      expect(mislabelled).toBe('@turbo-console/tools');
    });
  });
});
