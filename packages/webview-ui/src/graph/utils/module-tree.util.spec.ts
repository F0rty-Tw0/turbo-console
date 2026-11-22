import { describe, expect, it } from 'vitest';

import { moduleTreeOf } from './module-tree.util.ts';
import type { ModuleDir } from '../common/module-tree.type.ts';

type DirRow = [path: string, name: string, files: string[], fileCount: number];

const rowsOf = (dir: ModuleDir, files: string[]): DirRow[] => {
  const own: DirRow = [dir.path, dir.name, dir.files.map((index) => files[index] ?? '?'), dir.fileCount];
  const nested = dir.dirs.flatMap((child) => rowsOf(child, files));

  return [own, ...nested];
};

describe('FEATURE: module tree', () => {
  describe('GIVEN files out of order across nested folders', () => {
    const files = ['src/b.ts', 'src/lib/z.ts', 'index.ts', 'src/a.ts', 'src/Lib/y.ts', 'src/lib/x.ts'];

    it('WHEN the tree is built THEN folders and files sort by code unit and each folder counts every file under it', () => {
      const tree = moduleTreeOf(files);

      expect(rowsOf(tree.root, files)).toStrictEqual([
        ['', '', ['index.ts'], 6],
        ['src', 'src', ['src/a.ts', 'src/b.ts'], 5],
        ['src/Lib', 'Lib', ['src/Lib/y.ts'], 1],
        ['src/lib', 'lib', ['src/lib/x.ts', 'src/lib/z.ts'], 2]
      ]);
    });

    it('WHEN the tree is built THEN it keeps the input files unchanged', () => {
      expect(moduleTreeOf(files).files).toStrictEqual(files);
    });
  });

  describe('GIVEN a folder named __proto__', () => {
    it('WHEN the tree is built THEN it is an ordinary folder', () => {
      const files = ['__proto__/constructor.ts'];

      expect(rowsOf(moduleTreeOf(files).root, files)).toStrictEqual([
        ['', '', [], 1],
        ['__proto__', '__proto__', ['__proto__/constructor.ts'], 1]
      ]);
    });
  });

  describe('GIVEN no files', () => {
    it('WHEN the tree is built THEN it is an empty root', () => {
      expect(rowsOf(moduleTreeOf([]).root, [])).toStrictEqual([['', '', [], 0]]);
    });
  });
});
