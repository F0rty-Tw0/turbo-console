import { describe, expect, it } from 'vitest';

import { packageDirOf, packageTargetOf } from './package-target.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { PackageTarget } from '../common/package-action.type.ts';
import { ROOT_STATE_STUB } from '../test/stubs/root-state.stub.ts';
import { TASK_TREE_NODE_STUB, TREE_NODE_STUB } from '../test/stubs/tree-node.stub.ts';

const TARGET: PackageTarget = { root: '/ws', packageName: 'a' };

const NO_MODEL: RootState = { ...ROOT_STATE_STUB, model: null };

describe('FEATURE: package targets', () => {
  describe('GIVEN a command argument', () => {
    it.each<[string, unknown]>([
      ['a package node', TREE_NODE_STUB],
      ['a task node', TASK_TREE_NODE_STUB]
    ])('WHEN it is %s THEN the target is its package in its root', (_name, value) => {
      const target = packageTargetOf(value);

      expect(target).toStrictEqual(TARGET);
    });

    it.each<[string, unknown]>([
      ['a root node', { ...TREE_NODE_STUB, kind: 'root' }],
      ['a directory node', { ...TREE_NODE_STUB, kind: 'dir' }],
      ['missing', undefined],
      ['not an object', 'pkg:/ws\0a'],
      ['a package node with no package', { ...TREE_NODE_STUB, packageName: null }],
      ['a package node whose root is not a string', { ...TREE_NODE_STUB, root: 7 }]
    ])('WHEN it is %s THEN it targets no package', (_name, value) => {
      const target = packageTargetOf(value);

      expect(target).toBeNull();
    });
  });

  describe('GIVEN the target package a under packages/a', () => {
    it('WHEN its root holds it THEN its directory is the root joined with the package path', () => {
      const directory = packageDirOf(TARGET, ROOT_STATE_STUB);

      expect(directory).toBe('/ws/packages/a');
    });

    it('WHEN its root ends in a separator THEN the directory is joined without a doubled separator', () => {
      const slashed: PackageTarget = { root: '/ws/', packageName: 'web' };

      const directory = packageDirOf(slashed, ROOT_STATE_STUB);

      expect(directory).toBe('/ws/apps/web');
    });

    it.each<[string, RootState | undefined]>([
      ['gone', undefined],
      ['without a model', NO_MODEL]
    ])('WHEN its root is %s THEN it has no directory', (_name, state) => {
      const directory = packageDirOf(TARGET, state);

      expect(directory).toBeNull();
    });

    it('WHEN the model no longer holds the package THEN it has no directory', () => {
      const gone: PackageTarget = { root: '/ws', packageName: 'gone' };

      const directory = packageDirOf(gone, ROOT_STATE_STUB);

      expect(directory).toBeNull();
    });
  });
});
