import { describe, expect, it } from 'vitest';

import { folderGroupsOf, folderOf, modeGroupsOf, tagsOf } from './folder-group.util.ts';
import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { FolderGroup } from '../common/folder-group.type.ts';

const pkgOf = (name: string, path: string, tags: string[] = []): GraphPackage => {
  const pkg: GraphPackage = { name, path, tags, taskCount: 0 };

  return pkg;
};

const namesOf = (group: FolderGroup): string[] => group.packages.map((pkg) => pkg.name);

const MIXED: GraphPackage[] = [
  pkgOf('web', 'apps/web'),
  pkgOf('button', 'packages/ui/button'),
  pkgOf('zeta', 'apps/zeta'),
  pkgOf('tools-pkg', 'tools'),
  pkgOf('root-pkg', ''),
  pkgOf('admin', 'apps/admin')
];

describe('FEATURE: folderOf', () => {
  it.each([
    ['apps/web', 'apps'],
    ['packages/ui/button', 'packages/ui'],
    ['tools', ''],
    ['', ''],
    ['(root)/a', '(root)'],
    ['__proto__/x', '__proto__']
  ])('GIVEN the path %j WHEN the folder is taken THEN it is %j', (path, expected) => {
    const folder = folderOf(path);

    expect(folder).toBe(expected);
  });
});

describe('FEATURE: folderGroupsOf', () => {
  describe('GIVEN packages in several folders and at the root', () => {
    it('WHEN grouped THEN the root group comes first, then folders by code unit', () => {
      const groups = folderGroupsOf(MIXED);

      expect(groups.map((group) => group.folder)).toStrictEqual(['', 'apps', 'packages/ui']);
    });

    it('WHEN grouped THEN the rows of each group are sorted by name', () => {
      const groups = folderGroupsOf(MIXED);

      expect(groups.map(namesOf)).toStrictEqual([['root-pkg', 'tools-pkg'], ['admin', 'web', 'zeta'], ['button']]);
    });
  });

  describe('GIVEN a top-level folder named (root) and a package at the root', () => {
    it('WHEN grouped THEN they land in two groups, the root one first', () => {
      const rootPkg = pkgOf('a', 'a');
      const folderPkg = pkgOf('b', '(root)/b');

      const groups = folderGroupsOf([folderPkg, rootPkg]);

      expect(groups).toStrictEqual([
        { folder: '', packages: [rootPkg] },
        { folder: '(root)', packages: [folderPkg] }
      ]);
    });
  });

  describe('GIVEN no packages', () => {
    it('WHEN grouped THEN there are no groups', () => {
      const groups = folderGroupsOf([]);

      expect(groups).toStrictEqual([]);
    });
  });

  describe('GIVEN a folder and a package named like Object.prototype keys', () => {
    it('WHEN grouped THEN they are plain data', () => {
      const constructorPkg = pkgOf('constructor', '__proto__/constructor');
      const aPkg = pkgOf('a', '__proto__/a');

      const groups = folderGroupsOf([constructorPkg, aPkg]);

      expect(groups).toStrictEqual([{ folder: '__proto__', packages: [aPkg, constructorPkg] }]);
    });
  });

  describe('GIVEN names that differ in case', () => {
    it('WHEN grouped THEN upper case sorts before lower case', () => {
      const groups = folderGroupsOf([pkgOf('alpha', 'x/alpha'), pkgOf('Zeta', 'x/Zeta')]);

      expect(groups.map(namesOf)).toStrictEqual([['Zeta', 'alpha']]);
    });
  });

  describe('GIVEN an unsorted input', () => {
    it('WHEN grouped THEN the input order is unchanged', () => {
      const input = [pkgOf('b', 'x/b'), pkgOf('a', 'x/a')];

      folderGroupsOf(input);

      expect(input.map((pkg) => pkg.name)).toStrictEqual(['b', 'a']);
    });
  });
});

describe('FEATURE: modeGroupsOf', () => {
  describe('GIVEN packages in several folders', () => {
    it('WHEN the mode is flat THEN there are no groups', () => {
      expect(modeGroupsOf(MIXED, 'flat')).toBeNull();
    });

    it('WHEN the mode is folders THEN the groups are folderGroupsOf', () => {
      expect(modeGroupsOf(MIXED, 'folders')).toStrictEqual(folderGroupsOf(MIXED));
    });
  });
});

describe('FEATURE: tagsOf', () => {
  it('GIVEN overlapping tags WHEN collected THEN each appears once, sorted by code unit', () => {
    const packages = [pkgOf('a', 'p', ['ui', 'app']), pkgOf('b', 'q', ['app', '__proto__']), pkgOf('c', 'r')];

    const tags = tagsOf(packages);

    expect(tags).toStrictEqual(['__proto__', 'app', 'ui']);
  });

  it('GIVEN no packages WHEN collected THEN there are no tags', () => {
    const tags = tagsOf([]);

    expect(tags).toStrictEqual([]);
  });
});
