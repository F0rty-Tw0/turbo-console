import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PackagesTree } from './packages-tree.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { TreeNode, TreePorts } from '../common/tree-node.type.ts';
import { ATOM_MODEL_STUB, A_FILE_STUB, LIVE_FILE_STUB, SPACED_FILE_STUB } from '../test/stubs/atom-view.stub.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { loadedWith } from '../test/utils/tree-model.spec.util.ts';
import { ATOM_IDLE_PORTS } from '../test/utils/tree-ports.spec.util.ts';

const PACKAGE_NODE: TreeNode = { kind: 'pkg', id: 'pkg:/ws\0e2e', root: '/ws', key: 'e2e', packageName: 'e2e' };

const UMBRELLA_NODE: TreeNode = { kind: 'task', id: 'task:/ws\0e2e#e2e-ci', root: '/ws', key: 'e2e#e2e-ci', packageName: 'e2e' };

const A_FILE_NODE: TreeNode = {
  kind: 'task',
  id: `task:/ws\0${A_FILE_STUB.task.id}`,
  root: '/ws',
  key: A_FILE_STUB.task.id,
  packageName: 'e2e'
};

describe('FEATURE: packages tree Atomizer rows', () => {
  describe('GIVEN a root holding the group of package e2e', () => {
    let tree: PackagesTree;

    beforeEach(() => {
      const store = new RootStore();
      const ports: TreePorts = {
        runs: () => undefined,
        scriptsShown: () => false,
        runningIds: () => new Set(),
        fire: vi.fn<TreePorts['fire']>(),
        treeVisible: new Map(),
        now: () => 7,
        wallNow: () => 7,
        atom: ATOM_IDLE_PORTS
      };
      const base = loadedWith([]);
      const loaded = { ...base, model: ATOM_MODEL_STUB };

      tree = new PackagesTree(store, 'list', 'builtin', ports);
      store.set([ROOT_FOLDER_STUB], coordinatorMock);
      store.apply('/ws', loaded);
    });

    it('WHEN the package is opened THEN the umbrella shows and the aggregate does not', async () => {
      const tasks = await tree.children(PACKAGE_NODE);

      expect(tasks.map((node) => node.key)).toStrictEqual(['e2e#build', 'e2e#e2e-ci']);
    });

    it('WHEN the umbrella is opened THEN its three files show', async () => {
      const files = await tree.children(UMBRELLA_NODE);

      expect(files.map((node) => node.key)).toStrictEqual([A_FILE_STUB.task.id, SPACED_FILE_STUB.task.id, LIVE_FILE_STUB.task.id]);
    });

    it('WHEN the umbrella is read THEN it counts its files', () => {
      expect(tree.rowOf(UMBRELLA_NODE).description).toBe('3 files');
    });

    it('WHEN a file is read THEN its description is bare', () => {
      expect(tree.rowOf(A_FILE_NODE).description).toBe('');
    });
  });
});
