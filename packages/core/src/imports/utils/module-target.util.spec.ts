import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { memoTargetOf } from './module-target.util.ts';
import type { ModuleTarget } from '../common/module-graph.type.ts';
import { A_DIR } from '../test/common/module-dirs.const.ts';
import { contextOf } from '../test/utils/module-context.spec.util.ts';

describe('FEATURE: memoise module targets per importing dir and specifier', () => {
  describe('GIVEN an empty memo and package a with src/b.ts walked', () => {
    it('WHEN (src, ./b) is resolved twice THEN the second call returns the memoised target and the memo holds one entry', () => {
      const memo = new Map<string, Map<string, ModuleTarget>>();
      const fromDir = join(A_DIR, 'src');
      const first = memoTargetOf(memo, contextOf(['src/b.ts']), fromDir, './b');
      const second = memoTargetOf(memo, contextOf(['src/b.ts']), fromDir, './b');

      expect(first).toStrictEqual({ kind: 'file', file: 'src/b.ts' });
      const dirs = Array.from(memo.keys());

      expect(second).toBe(first);
      expect(dirs).toStrictEqual([fromDir]);
    });

    it('WHEN ./b is resolved from src and then from lib THEN the memo holds one key per importing dir', () => {
      const memo = new Map<string, Map<string, ModuleTarget>>();
      const srcDir = join(A_DIR, 'src');
      const libDir = join(A_DIR, 'lib');

      memoTargetOf(memo, contextOf(['src/b.ts']), srcDir, './b');
      const fromLib = memoTargetOf(memo, contextOf(['src/b.ts']), libDir, './b');
      const dirs = Array.from(memo.keys());

      expect(fromLib).toStrictEqual({ kind: 'unresolved' });
      expect(dirs).toStrictEqual([srcDir, libDir]);
    });
  });
});
