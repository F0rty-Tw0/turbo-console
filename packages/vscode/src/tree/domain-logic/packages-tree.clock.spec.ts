import { describe, expect, it, vi } from 'vitest';

import { PackagesTree } from './packages-tree.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { TreeNode, TreePorts } from '../common/tree-node.type.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { loadedWith, packageNamed } from '../test/utils/tree-model.spec.util.ts';
import { SCRIPTS_HIDDEN_PORTS } from '../test/utils/tree-ports.spec.util.ts';

const WALL_NOW = 1_000_000;

const RUNNING: RunEntry = {
  ...RUN_ENTRY_STUB,
  root: ROOT_FOLDER_STUB.root,
  taskId: 'a#build',
  state: 'running',
  launchedAt: WALL_NOW - 12_345
};

const onlyOf = (nodes: TreeNode[]): TreeNode => {
  const [only] = nodes;

  if (only === undefined) throw new Error('no node');

  return only;
};

describe('FEATURE: packages tree clock', () => {
  describe('GIVEN a running task, a span clock reading 5 and a wall clock 12 345 ms after its launch', () => {
    it('WHEN its row is read THEN the elapsed time counts on the wall clock, the base of the launch time', async () => {
      const store = new RootStore();
      const ports: TreePorts = {
        runs: () => RUNNING,
        ...SCRIPTS_HIDDEN_PORTS,
        fire: vi.fn(),
        treeVisible: new Map(),
        now: () => 5,
        wallNow: () => WALL_NOW
      };
      const tree = new PackagesTree(store, 'list', 'builtin', ports);

      store.set([ROOT_FOLDER_STUB], coordinatorMock);
      store.apply(ROOT_FOLDER_STUB.root, loadedWith([packageNamed('a')]));
      const pkg = onlyOf(await tree.children());
      const task = onlyOf(await tree.children(pkg));

      const row = tree.rowOf(task);

      expect(row.description).toBe('running · 12s');
    });
  });
});
