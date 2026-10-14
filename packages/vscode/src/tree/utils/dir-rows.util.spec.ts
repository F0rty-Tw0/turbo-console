import type { PackageNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { dirRows } from './dir-rows.util.ts';
import { packageMapOf } from './package-map.util.ts';
import { DESCRIPTION_MAX, LABEL_MAX } from '../../shared/common/text.const.ts';
import type { FolderDir } from '../common/folder-tree.type.ts';
import type { IconSpec } from '../common/tree-row.type.ts';
import { PACKAGE_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';

const BIDI = String.fromCodePoint(0x202e);

const FOLDER_ICON: IconSpec = { id: 'folder', color: null };
const PACKAGE_ICON: IconSpec = { id: 'package', color: null };

const packageAt = (name: string, path: string): PackageNode => {
  const node: PackageNode = { ...PACKAGE_NODE_STUB, name, path };

  return node;
};

const dirOf = (path: string, label: string, packages: string[], dirs: FolderDir[] = []): FolderDir => {
  const dir: FolderDir = { path, label, dirs, packages };

  return dir;
};

describe('FEATURE: children rows of a directory', () => {
  describe('GIVEN a directory holding a child directory and a package', () => {
    const libs = dirOf('packages/libs', 'libs', []);
    const packages = packageMapOf([packageAt('a', 'packages/a')]);
    const dir = dirOf('packages', 'packages', ['a'], [libs]);

    it('WHEN listed THEN the directory row comes before the package row', () => {
      const rows = dirRows('/ws', dir, packages);

      expect(rows.map((row) => row.id)).toStrictEqual(['dir:/ws\0packages/libs', 'pkg:/ws\0a']);
    });

    it('WHEN listed THEN the directory row is an expanded folder keyed by its path', () => {
      const rows = dirRows('/ws', dir, packages);

      expect(rows[0]).toStrictEqual({
        id: 'dir:/ws\0packages/libs',
        kind: 'dir',
        root: '/ws',
        key: 'packages/libs',
        packageName: null,
        label: 'libs',
        description: '',
        icon: FOLDER_ICON,
        contextValue: 'turboDir',
        collapsible: 'expanded',
        tooltip: [],
        command: null
      });
    });

    it('WHEN listed THEN the package row is collapsed with the package path as description', () => {
      const rows = dirRows('/ws', dir, packages);

      expect(rows[1]).toStrictEqual({
        id: 'pkg:/ws\0a',
        kind: 'pkg',
        root: '/ws',
        key: 'a',
        packageName: 'a',
        label: 'a',
        description: 'packages/a',
        icon: PACKAGE_ICON,
        contextValue: 'turboPackage',
        collapsible: 'collapsed',
        tooltip: [],
        command: null
      });
    });
  });

  describe('GIVEN a directory with several child directories and packages', () => {
    it('WHEN listed THEN every directory row precedes every package row and each group keeps its order', () => {
      const dirs = [dirOf('p/b', 'b', []), dirOf('p/c', 'c', [])];
      const dir = dirOf('p', 'p', ['x', 'y'], dirs);
      const packages = packageMapOf([packageAt('x', 'p/x'), packageAt('y', 'p/y')]);

      const rows = dirRows('/ws', dir, packages);

      expect(rows.map((row) => row.key)).toStrictEqual(['p/b', 'p/c', 'x', 'y']);
    });
  });

  describe('GIVEN the top level of a tree', () => {
    it('WHEN listed THEN directories come before packages there too', () => {
      const level = { dirs: [dirOf('z', 'z', [])], packages: ['a'] };

      const rows = dirRows('/ws', level, packageMapOf([packageAt('a', 'a')]));

      expect(rows.map((row) => row.kind)).toStrictEqual(['dir', 'pkg']);
    });
  });

  describe('GIVEN a package name missing from the model', () => {
    it('WHEN listed THEN no row is made for it', () => {
      const dir = dirOf('p', 'p', ['ghost', 'x']);

      const rows = dirRows('/ws', dir, packageMapOf([packageAt('x', 'p/x')]));

      expect(rows.map((row) => row.key)).toStrictEqual(['x']);
    });
  });

  describe('GIVEN a top-level package whose path is its name', () => {
    it('WHEN listed THEN the description is empty, since it would repeat the label', () => {
      const level = dirOf('', '', ['docs']);

      const rows = dirRows('/ws', level, packageMapOf([packageAt('docs', 'docs')]));

      expect(rows.map((row) => [row.label, row.description])).toStrictEqual([['docs', '']]);
    });
  });

  describe('GIVEN a directory with nothing in it', () => {
    it('WHEN listed THEN there are no rows', () => {
      const rows = dirRows('/ws', dirOf('p', 'p', []), packageMapOf([]));

      expect(rows).toStrictEqual([]);
    });
  });

  describe('GIVEN untrusted names and paths', () => {
    it('WHEN a directory label holds a bidi control THEN the label is cleaned and the id keeps the raw path', () => {
      const raw = `a${BIDI}b`;
      const dir = dirOf('p', 'p', [], [dirOf(`p/${raw}`, raw, [])]);

      const rows = dirRows('/ws', dir, packageMapOf([]));

      expect(rows[0]).toMatchObject({ id: `dir:/ws\0p/${raw}`, key: `p/${raw}`, label: 'ab' });
    });

    it('WHEN a package path holds a bidi control THEN the description is cleaned', () => {
      const dir = dirOf('p', 'p', ['x']);

      const rows = dirRows('/ws', dir, packageMapOf([packageAt('x', `p/${BIDI}x`)]));

      expect(rows[0]?.description).toBe('p/x');
    });

    it('WHEN a package name is longer than the label limit THEN the label is cut and the key is whole', () => {
      const name = 'n'.repeat(LABEL_MAX + 30);
      const dir = dirOf('p', 'p', [name]);

      const rows = dirRows('/ws', dir, packageMapOf([packageAt(name, 'p/x')]));

      expect(rows[0]).toMatchObject({ key: name, packageName: name, label: `${'n'.repeat(LABEL_MAX - 1)}…` });
    });

    it('WHEN a directory label is longer than the label limit THEN the label is cut', () => {
      const label = 'd'.repeat(LABEL_MAX + 30);
      const dir = dirOf('p', 'p', [], [dirOf('p/d', label, [])]);

      const rows = dirRows('/ws', dir, packageMapOf([]));

      expect(rows[0]?.label).toBe(`${'d'.repeat(LABEL_MAX - 1)}…`);
    });

    it('WHEN a package path is longer than the description limit THEN the description is cut', () => {
      const path = `p/${'d'.repeat(DESCRIPTION_MAX + 30)}`;
      const dir = dirOf('p', 'p', ['x']);

      const rows = dirRows('/ws', dir, packageMapOf([packageAt('x', path)]));

      expect(rows[0]?.description).toBe(`${path.slice(0, DESCRIPTION_MAX - 1)}…`);
    });
  });
});
