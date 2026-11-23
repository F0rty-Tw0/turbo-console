import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { moduleGraphOf } from './module-graph.util.ts';
import type { PackageImportScan, SourceImport } from '../common/import-scan.type.ts';
import type { ModuleGraphInput, WorkspaceTarget } from '../common/module-graph.type.ts';
import { A_DIR, Y_DIR } from '../test/common/module-dirs.const.ts';
import { importOf, moduleScanOf } from '../test/utils/module-scan.spec.util.ts';

const B_TARGET: WorkspaceTarget = { name: '@s/b', names: ['@s/b'], dir: Y_DIR };
const Z_TARGET: WorkspaceTarget = { name: '@s/z', names: ['@s/z'], dir: resolve('/ws/z') };
const MIXED_WALKED = ['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/a.spec.ts'];

const MIXED_A_IMPORTS: SourceImport[] = [
  importOf('./b.js'),
  importOf('./b', { kind: 'reexport' }),
  importOf('./b', { isType: true }),
  importOf('./c', { kind: 'dynamic' }),
  importOf('./a'),
  importOf('react'),
  importOf('@s/b'),
  importOf('./gone')
];

const MIXED_C_IMPORTS: SourceImport[] = [importOf('./b', { kind: 'require' })];
const SKIPPED_IMPORTS: SourceImport[] = [importOf('./big'), importOf('./late')];
const Z_IMPORTS: SourceImport[] = [importOf('@s/z'), importOf('@s/b')];
const A_IMPORTS: SourceImport[] = [importOf('@s/b')];

const inputOf = (scan: PackageImportScan): ModuleGraphInput => {
  const others = [B_TARGET];
  const input: ModuleGraphInput = { dir: A_DIR, selfName: '@s/a', scan, others };

  return input;
};

describe('FEATURE: fold a package scan into module links', () => {
  describe('GIVEN src/a.ts importing ./b twice, ./b as a type, ./c dynamically, ./a, react, @s/b and ./gone, plus src/c.ts, src/b.ts and src/a.spec.ts', () => {
    const scan = moduleScanOf(MIXED_WALKED, { 'src/a.ts': MIXED_A_IMPORTS, 'src/c.ts': MIXED_C_IMPORTS });

    it('WHEN folded THEN file links are summed per pair, the self-loop is dropped and the links are sorted', () => {
      const graph = moduleGraphOf(inputOf(scan));

      expect(graph.fileLinks).toStrictEqual([
        [0, 1, 2, 1, 0],
        [0, 2, 0, 0, 1],
        [2, 1, 0, 0, 1]
      ]);
    });

    it('WHEN folded THEN the stub link, the counts and the test indexes match', () => {
      const graph = moduleGraphOf(inputOf(scan));

      expect(graph.stubs).toStrictEqual(['@s/b']);
      expect(graph.stubLinks).toStrictEqual([[0, 0, 1, 0, 0]]);
      expect(graph.counts).toStrictEqual({ unresolved: 1, external: 1, assets: 0, self: 0 });
      expect(graph.tests).toStrictEqual([3]);
    });
  });

  describe('GIVEN walked a.ts, big.ts (skipped) and late.ts (unreached), where a.ts imports both', () => {
    it('WHEN folded THEN both are nodes with incoming links', () => {
      const scan = moduleScanOf(['a.ts', 'big.ts', 'late.ts'], { 'a.ts': SKIPPED_IMPORTS });
      const graph = moduleGraphOf(inputOf(scan));

      expect(graph.files).toStrictEqual(['a.ts', 'big.ts', 'late.ts']);
      expect(graph.fileLinks).toStrictEqual([
        [0, 1, 1, 0, 0],
        [0, 2, 1, 0, 0]
      ]);
    });
  });

  describe('GIVEN z.ts and a.ts importing stubs @s/z and @s/b, walked in that order', () => {
    it('WHEN folded THEN stubs are sorted by name and stub links by (from, to)', () => {
      const scan = moduleScanOf(['z.ts', 'a.ts'], { 'z.ts': Z_IMPORTS, 'a.ts': A_IMPORTS });
      const others = [Z_TARGET, B_TARGET];
      const input = inputOf(scan);
      const graph = moduleGraphOf({ ...input, others });

      expect(graph.stubs).toStrictEqual(['@s/b', '@s/z']);
      expect(graph.stubLinks).toStrictEqual([
        [0, 0, 1, 0, 0],
        [0, 1, 1, 0, 0],
        [1, 0, 1, 0, 0]
      ]);
    });
  });
});
