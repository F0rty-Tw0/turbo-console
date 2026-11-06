import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { scanDirsOf } from './scan-dirs.util.ts';
import { IMPORT_ROOT } from '../test/common/import-edge.const.ts';
import { graphPackageOf } from '../test/utils/graph-model.spec.util.ts';

const ROOT_PACKAGE = graphPackageOf('r', '');
const A = graphPackageOf('a', 'packages/a');
const B = graphPackageOf('b', 'packages/b');
const C = graphPackageOf('c', 'packages/b/c');
const PACKAGES = [ROOT_PACKAGE, A, B, C];
const A_DIR = join(IMPORT_ROOT, 'packages', 'a');
const B_DIR = join(IMPORT_ROOT, 'packages', 'b');
const C_DIR = join(IMPORT_ROOT, 'packages', 'b', 'c');

describe('FEATURE: scan dirs of an edge', () => {
  describe('GIVEN packages root, a, b and b/c', () => {
    it('WHEN a → b is built THEN A is packages/a, B packages/b, and b and b/c are skipped, neither a nor the root', () => {
      const dirs = scanDirsOf(IMPORT_ROOT, PACKAGES, A, B);

      expect(dirs).toStrictEqual({ sourceDir: A_DIR, targetDir: B_DIR, skipDirs: new Set([B_DIR, C_DIR]) });
    });

    it('WHEN a → the root package is built THEN targetDir is null', () => {
      const dirs = scanDirsOf(IMPORT_ROOT, PACKAGES, A, ROOT_PACKAGE);

      expect(dirs.targetDir).toBeNull();
    });

    it('WHEN the root package → a is built THEN sourceDir is the root and a, b, b/c are skipped', () => {
      const dirs = scanDirsOf(IMPORT_ROOT, PACKAGES, ROOT_PACKAGE, A);

      expect(dirs).toStrictEqual({ sourceDir: IMPORT_ROOT, targetDir: A_DIR, skipDirs: new Set([A_DIR, B_DIR, C_DIR]) });
    });

    it('WHEN the source is a copy of a THEN a is still not skipped', () => {
      const copyOfA = { ...A };

      const dirs = scanDirsOf(IMPORT_ROOT, PACKAGES, copyOfA, B);

      expect(dirs.skipDirs).toStrictEqual(new Set([B_DIR, C_DIR]));
    });

    it('WHEN b → c (target nested in source) is built THEN c and a are skipped', () => {
      const dirs = scanDirsOf(IMPORT_ROOT, PACKAGES, B, C);

      expect(dirs).toStrictEqual({ sourceDir: B_DIR, targetDir: C_DIR, skipDirs: new Set([A_DIR, C_DIR]) });
    });
  });
});
