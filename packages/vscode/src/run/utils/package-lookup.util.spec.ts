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

const ROOT_BASE = packageAt('//', '');
const ROOT_PACKAGE: PackageNode = { ...ROOT_BASE, label: 'single-app' };
const SINGLE: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, singlePackage: true, packages: [ROOT_PACKAGE] };

describe('FEATURE: package lookup', () => {
  describe('packageForManifest', () => {
    describe('GIVEN a package manifest', () => {
      it('WHEN looked up THEN the package at that directory returns', () => {
        expect(packageForManifest('packages/a/package.json', MODEL)?.name).toBe('a');
      });
    });

    describe('GIVEN a nested package manifest', () => {
      it('WHEN looked up THEN the deepest directory matches whole', () => {
        expect(packageForManifest('packages/libs/x/package.json', MODEL)?.name).toBe('x');
      });
    });

    describe('GIVEN a model with no // package', () => {
      it('WHEN the root manifest is looked up THEN there is none', () => {
        expect(packageForManifest('package.json', MODEL)).toBeNull();
      });
    });

    describe('GIVEN a single-package model', () => {
      it('WHEN the root manifest is looked up THEN the // package returns', () => {
        expect(packageForManifest('package.json', SINGLE)?.name).toBe('//');
      });

      it('WHEN a nested manifest is looked up THEN there is none', () => {
        expect(packageForManifest('sub/package.json', SINGLE)).toBeNull();
      });
    });

    describe('GIVEN a monorepo model holding the // package at path ""', () => {
      it('WHEN the root manifest is looked up THEN the // package returns', () => {
        const monorepo: WorkspaceModel = { ...MODEL, packages: [ROOT_PACKAGE, ...MODEL.packages] };

        expect(packageForManifest('package.json', monorepo)?.name).toBe('//');
      });
    });

    describe('GIVEN the root itself', () => {
      it('WHEN looked up THEN there is none', () => {
        expect(packageForManifest('', MODEL)).toBeNull();
      });
    });

    describe('GIVEN a directory that is no package', () => {
      it('WHEN looked up THEN there is none', () => {
        expect(packageForManifest('packages/libs/package.json', MODEL)).toBeNull();
      });
    });

    describe('GIVEN a directory that only starts like a package path', () => {
      it('WHEN looked up THEN there is none', () => {
        expect(packageForManifest('packages/ab/package.json', MODEL)).toBeNull();
      });
    });

    describe('GIVEN a file named like the manifest but not package.json', () => {
      it('WHEN looked up THEN there is none', () => {
        expect(packageForManifest('packages/a/package.yaml', MODEL)).toBeNull();
      });
    });

    describe('GIVEN Windows separators', () => {
      it('WHEN looked up THEN they are normalised', () => {
        expect(packageForManifest('packages\\a\\package.json', MODEL)?.name).toBe('a');
      });
    });

    describe('GIVEN a package path with backslashes', () => {
      it('WHEN looked up THEN it matches the posix directory', () => {
        const windows: WorkspaceModel = { ...MODEL, packages: [packageAt('a', 'packages\\a')] };

        expect(packageForManifest('packages/a/package.json', windows)?.name).toBe('a');
      });
    });
  });

  describe('relativePathOf', () => {
    describe('GIVEN a file under the root', () => {
      it('WHEN cut THEN the rest after the separator returns', () => {
        expect(relativePathOf('/ws', '/ws/packages/a/package.json')).toBe('packages/a/package.json');
      });
    });

    describe('GIVEN a root and a file differing in case', () => {
      it('WHEN cut THEN the rest returns as the file spells it', () => {
        expect(relativePathOf('c:\\ws', 'C:\\WS\\packages\\a\\package.json')).toBe('packages\\a\\package.json');
      });
    });

    describe('GIVEN the root itself', () => {
      it('WHEN cut THEN the rest is empty', () => {
        expect(relativePathOf('/ws', '/ws')).toBe('');
      });
    });

    describe('GIVEN the filesystem root as the root', () => {
      it('WHEN cut THEN no character after its separator is lost', () => {
        expect(relativePathOf('/', '/packages/a/package.json')).toBe('packages/a/package.json');
      });
    });

    describe('GIVEN a drive root as the root', () => {
      it('WHEN cut THEN no character after its separator is lost', () => {
        expect(relativePathOf('c:\\', 'c:\\packages\\a\\package.json')).toBe('packages\\a\\package.json');
      });
    });
  });
});
