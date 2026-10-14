import type { PackageNode, WorkspaceModel } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { packageForManifest, relativePathOf } from './package-lookup.util.ts';
import { PACKAGE_NODE_STUB, WORKSPACE_MODEL_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';

const packageAt = (name: string, path: string): PackageNode => {
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, name, path };

  return pkg;
};

const MODEL: WorkspaceModel = {
  ...WORKSPACE_MODEL_STUB,
  packages: [packageAt('a', 'packages/a'), packageAt('x', 'packages/libs/x'), packageAt('web', 'apps/web')]
};

describe('FEATURE: package lookup', () => {
  describe('packageForManifest', () => {
    it('GIVEN a package manifest WHEN looked up THEN the package at that directory returns', () => {
      expect(packageForManifest('packages/a/package.json', MODEL)?.name).toBe('a');
    });

    it('GIVEN a nested package manifest WHEN looked up THEN the deepest directory matches whole', () => {
      expect(packageForManifest('packages/libs/x/package.json', MODEL)?.name).toBe('x');
    });

    it('GIVEN the root manifest WHEN looked up THEN there is none', () => {
      expect(packageForManifest('package.json', MODEL)).toBeNull();
    });

    it('GIVEN the root itself WHEN looked up THEN there is none', () => {
      expect(packageForManifest('', MODEL)).toBeNull();
    });

    it('GIVEN a directory that is no package WHEN looked up THEN there is none', () => {
      expect(packageForManifest('packages/libs/package.json', MODEL)).toBeNull();
    });

    it('GIVEN a directory that only starts like a package path WHEN looked up THEN there is none', () => {
      expect(packageForManifest('packages/ab/package.json', MODEL)).toBeNull();
    });

    it('GIVEN a file named like the manifest but not package.json WHEN looked up THEN there is none', () => {
      expect(packageForManifest('packages/a/package.yaml', MODEL)).toBeNull();
    });

    it('GIVEN Windows separators WHEN looked up THEN they are normalised', () => {
      expect(packageForManifest('packages\\a\\package.json', MODEL)?.name).toBe('a');
    });

    it('GIVEN a package path with backslashes WHEN looked up THEN it matches the posix directory', () => {
      const windows: WorkspaceModel = { ...MODEL, packages: [packageAt('a', 'packages\\a')] };

      expect(packageForManifest('packages/a/package.json', windows)?.name).toBe('a');
    });
  });

  describe('relativePathOf', () => {
    it('GIVEN a file under the root WHEN cut THEN the rest after the separator returns', () => {
      expect(relativePathOf('/ws', '/ws/packages/a/package.json')).toBe('packages/a/package.json');
    });

    it('GIVEN a root and a file differing in case WHEN cut THEN the rest returns as the file spells it', () => {
      expect(relativePathOf('c:\\ws', 'C:\\WS\\packages\\a\\package.json')).toBe('packages\\a\\package.json');
    });

    it('GIVEN the root itself WHEN cut THEN the rest is empty', () => {
      expect(relativePathOf('/ws', '/ws')).toBe('');
    });
  });
});
