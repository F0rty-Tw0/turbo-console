import type { PackageNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { folderTree, packageList } from './folder-tree.util.ts';
import type { FolderDir } from '../common/folder-tree.type.ts';
import { PACKAGE_NODE_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';

const packageAt = (name: string, path: string): PackageNode => {
  const node: PackageNode = { ...PACKAGE_NODE_STUB, name, path };

  return node;
};

const dirOf = (path: string, label: string, packages: string[], dirs: FolderDir[] = []): FolderDir => {
  const dir: FolderDir = { path, label, dirs, packages };

  return dir;
};

describe('FEATURE: folder grouping of packages', () => {
  describe('GIVEN packages in no particular order', () => {
    it('WHEN listed THEN names come back sorted in default string order', () => {
      const packages = [packageAt('b', 'p/b'), packageAt('a', 'p/a'), packageAt('B', 'p/B')];

      const names = packageList(packages);

      expect(names).toStrictEqual(['B', 'a', 'b']);
    });

    it('WHEN listed THEN the input array keeps its order', () => {
      const packages = [packageAt('b', 'p/b'), packageAt('a', 'p/a')];

      packageList(packages);

      expect(packages.map((pkg) => pkg.name)).toStrictEqual(['b', 'a']);
    });
  });

  describe('GIVEN the stub model with apps/web, packages/a and packages/libs/x', () => {
    it('WHEN grouped THEN nested directories hold their packages', () => {
      const libs = dirOf('packages/libs', 'libs', ['@org/x']);
      const packagesDir = dirOf('packages', 'packages', ['a'], [libs]);
      const apps = dirOf('apps', 'apps', ['web']);

      const tree = folderTree(WORKSPACE_MODEL_STUB.packages);

      expect(tree).toStrictEqual({ dirs: [apps, packagesDir], packages: [] });
    });
  });

  describe('GIVEN a directory with one child directory and no package of its own', () => {
    it('WHEN grouped THEN the two merge into one node labelled with the joined path', () => {
      const packages = [packageAt('y', 'packages/libs/y'), packageAt('x', 'packages/libs/x')];

      const tree = folderTree(packages);

      expect(tree).toStrictEqual({ dirs: [dirOf('packages/libs', 'packages/libs', ['x', 'y'])], packages: [] });
    });

    it('WHEN the chain is three directories deep THEN all three merge into one node', () => {
      const packages = [packageAt('x', 'a/b/c/x')];

      const tree = folderTree(packages);

      expect(tree).toStrictEqual({ dirs: [dirOf('a/b/c', 'a/b/c', ['x'])], packages: [] });
    });

    it('WHEN the merged node has two child directories THEN the child nodes keep their own labels', () => {
      const packages = [packageAt('x', 'a/b/x/p'), packageAt('y', 'a/b/y/p')];

      const tree = folderTree(packages);
      const merged = tree.dirs[0];

      expect(merged?.label).toBe('a/b');
      expect(merged?.dirs.map((dir) => dir.label)).toStrictEqual(['x', 'y']);
    });
  });

  describe('GIVEN a directory with one child directory and a package of its own', () => {
    it('WHEN grouped THEN it is not merged', () => {
      const packages = [packageAt('a', 'packages/a'), packageAt('x', 'packages/libs/x')];

      const tree = folderTree(packages);

      expect(tree.dirs.map((dir) => dir.label)).toStrictEqual(['packages']);
      expect(tree.dirs[0]?.dirs.map((dir) => dir.label)).toStrictEqual(['libs']);
    });
  });

  describe('GIVEN sibling directories where a merged label sorts differently from its first segment', () => {
    it('WHEN grouped THEN directories are ordered by label', () => {
      const packages = [packageAt('p', 'a/b/p'), packageAt('q', 'a-x/q')];

      const tree = folderTree(packages);

      expect(tree.dirs.map((dir) => dir.label)).toStrictEqual(['a-x', 'a/b']);
    });
  });

  describe('GIVEN sibling directories whose labels differ by case', () => {
    it('WHEN grouped THEN they are ordered by default string order, upper case first', () => {
      const packages = [packageAt('x', 'b/x'), packageAt('y', 'B/y'), packageAt('z', 'a/z')];

      const tree = folderTree(packages);

      expect(tree.dirs.map((dir) => dir.label)).toStrictEqual(['B', 'a', 'b']);
    });
  });

  describe('GIVEN a mix of merged, nested and package directories', () => {
    it('WHEN grouped THEN every directory path is unique', () => {
      const packages = [
        packageAt('tools', 'tools'),
        packageAt('cli', 'tools/cli'),
        packageAt('ui', 'shared/ui'),
        packageAt('kit', 'shared/ui/kit/core'),
        packageAt('z', 'libs/deep/z'),
        packageAt('x', 'packages/libs/x'),
        packageAt('a', 'packages/a')
      ];
      const pathsOf = (dir: FolderDir): string[] => {
        const nested = dir.dirs.flatMap(pathsOf);

        return [dir.path, ...nested];
      };

      const tree = folderTree(packages);
      const paths = tree.dirs.flatMap(pathsOf);

      expect(new Set(paths).size).toBe(paths.length);
      expect(paths.toSorted()).toStrictEqual([
        'libs/deep',
        'packages',
        'packages/libs',
        'shared',
        'shared/ui',
        'shared/ui/kit',
        'tools'
      ]);
    });
  });

  describe('GIVEN a nested level with several child directories', () => {
    it('WHEN grouped THEN the child directories are ordered by label there too', () => {
      const packages = [packageAt('own', 'p/own'), packageAt('z', 'p/z/q'), packageAt('b', 'p/a/b/q'), packageAt('x', 'p/a-x/q')];

      const tree = folderTree(packages);

      expect(tree.dirs[0]?.dirs.map((dir) => dir.label)).toStrictEqual(['a-x', 'a/b', 'z']);
    });
  });

  describe('GIVEN a level holding both directories and packages', () => {
    it('WHEN grouped THEN the level lists directories and packages apart, each sorted', () => {
      const packages = [packageAt('z', 'web'), packageAt('m', 'web2'), packageAt('c', 'zz/c'), packageAt('d', 'aa/d')];

      const tree = folderTree(packages);

      expect(tree.dirs.map((dir) => dir.label)).toStrictEqual(['aa', 'zz']);
      expect(tree.packages).toStrictEqual(['m', 'z']);
    });
  });

  describe('GIVEN a package whose directory also contains other packages', () => {
    it('WHEN grouped THEN it is a package in its parent and a directory of the same name holds the nested ones', () => {
      const packages = [packageAt('apps', 'apps'), packageAt('x', 'apps/x')];

      const tree = folderTree(packages);

      expect(tree).toStrictEqual({ dirs: [dirOf('apps', 'apps', ['x'])], packages: ['apps'] });
    });

    it('WHEN it sits below the top level THEN it is listed in its parent directory', () => {
      const packages = [packageAt('p', 'a/b'), packageAt('q', 'a/b/c')];

      const tree = folderTree(packages);
      const inner = dirOf('a/b', 'b', ['q']);

      expect(tree).toStrictEqual({ dirs: [dirOf('a', 'a', ['p'], [inner])], packages: [] });
    });

    it('WHEN its directory has one child directory and no other package THEN the directory keeps its name and is not merged', () => {
      const packages = [packageAt('p', 'packages'), packageAt('x', 'packages/libs/x')];

      const tree = folderTree(packages);
      const libs = dirOf('packages/libs', 'libs', ['x']);

      expect(tree).toStrictEqual({ dirs: [dirOf('packages', 'packages', [], [libs])], packages: ['p'] });
    });

    it('WHEN that directory sits below the top level THEN it is not merged either', () => {
      const packages = [packageAt('libs', 'packages/libs'), packageAt('x', 'packages/libs/y/x')];

      const tree = folderTree(packages);
      const libs = dirOf('packages/libs', 'libs', [], [dirOf('packages/libs/y', 'y', ['x'])]);

      expect(tree).toStrictEqual({ dirs: [dirOf('packages', 'packages', ['libs'], [libs])], packages: [] });
    });
  });

  describe('GIVEN a top-level package with path web', () => {
    it('WHEN grouped THEN it is listed at the top level and no directory exists', () => {
      const packages = [packageAt('web', 'web')];

      const tree = folderTree(packages);

      expect(tree).toStrictEqual({ dirs: [], packages: ['web'] });
    });
  });

  describe('GIVEN package paths with backslashes', () => {
    it('WHEN grouped THEN they group exactly like posix paths', () => {
      const windows = [packageAt('x', 'packages\\libs\\x'), packageAt('y', 'packages\\libs\\y')];
      const posix = [packageAt('x', 'packages/libs/x'), packageAt('y', 'packages/libs/y')];

      const tree = folderTree(windows);

      expect(tree).toStrictEqual(folderTree(posix));
      expect(tree.dirs[0]?.path).toBe('packages/libs');
    });
  });

  describe('GIVEN paths with a leading or a doubled slash', () => {
    it('WHEN grouped THEN the empty segments are ignored', () => {
      const messy = [packageAt('a', '/packages//a'), packageAt('b', 'packages/b/')];
      const clean = [packageAt('a', 'packages/a'), packageAt('b', 'packages/b')];

      const tree = folderTree(messy);

      expect(tree).toStrictEqual(folderTree(clean));
    });

    it('WHEN a path holds ./ segments THEN they are ignored too', () => {
      const dotted = [packageAt('a', './packages/a'), packageAt('b', 'packages/./b')];
      const clean = [packageAt('a', 'packages/a'), packageAt('b', 'packages/b')];

      const tree = folderTree(dotted);

      expect(tree).toStrictEqual(folderTree(clean));
    });
  });

  describe('GIVEN no packages', () => {
    it('WHEN grouped THEN the tree is empty', () => {
      const tree = folderTree([]);

      expect(tree).toStrictEqual({ dirs: [], packages: [] });
    });
  });
});
