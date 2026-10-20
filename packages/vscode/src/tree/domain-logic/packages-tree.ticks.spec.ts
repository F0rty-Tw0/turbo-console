import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { PackagesTree } from './packages-tree.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { RunningTasks, TreeNode, TreePorts } from '../common/tree-node.type.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { loadedWith, packageNamed } from '../test/utils/tree-model.spec.util.ts';
import { SCRIPTS_HIDDEN_PORTS } from '../test/utils/tree-ports.spec.util.ts';

const OTHER_FOLDER: RootFolder = { root: '/other', name: 'other' };

const runningOf = (entries: [string, string[]][]): RunningTasks => {
  const pairs = entries.map(([root, ids]): [string, Set<string>] => [root, new Set(ids)]);

  return new Map(pairs);
};

const named = (nodes: TreeNode[], key: string): TreeNode => {
  const found = nodes.find((node) => node.key === key);

  if (found === undefined) throw new Error(`no node ${key}`);

  return found;
};

describe('FEATURE: packages tree tick refresh', () => {
  describe('GIVEN two roots whose tasks ws a#build, ws b#build and other a#build are shown, and other b#build is not', () => {
    let fire: Mock<TreePorts['fire']>;
    let tree: PackagesTree;
    let shownTasks: TreeNode[];

    /** The task nodes of `packageName` under the root node `root`, as VS Code asks for them. */
    const tasksOf = async (root: TreeNode, packageName: string): Promise<TreeNode[]> => {
      const packages = await tree.children(root);

      return tree.children(named(packages, packageName));
    };

    beforeEach(async () => {
      const store = new RootStore();
      const ports: TreePorts = {
        runs: () => undefined,
        ...SCRIPTS_HIDDEN_PORTS,
        fire: vi.fn(),
        treeVisible: new Map(),
        now: () => 7,
        wallNow: () => 7
      };

      fire = vi.mocked(ports.fire);
      tree = new PackagesTree(store, 'list', 'builtin', ports);
      store.set([ROOT_FOLDER_STUB, OTHER_FOLDER], coordinatorMock);
      store.apply('/ws', loadedWith([packageNamed('a'), packageNamed('b')]));
      store.apply('/other', loadedWith([packageNamed('a'), packageNamed('b')]));

      const [ws, other] = await tree.children();

      if (ws === undefined || other === undefined) throw new Error('no root nodes');

      const wsA = await tasksOf(ws, 'a');
      const wsB = await tasksOf(ws, 'b');
      const otherA = await tasksOf(other, 'a');

      shownTasks = [...wsA, ...wsB, ...otherA];
      fire.mockClear();
    });

    it('WHEN the shown tasks of both roots are refreshed THEN one fire carries all their nodes', () => {
      const running = runningOf([
        ['/ws', ['a#build', 'b#build']],
        ['/other', ['a#build']]
      ]);

      tree.refreshTasks(running);

      expect(fire.mock.calls).toStrictEqual([[shownTasks]]);
    });

    it('WHEN a task never shown is refreshed beside a shown one THEN the fire carries only the shown node', () => {
      const running = runningOf([['/other', ['b#build', 'a#build']]]);

      tree.refreshTasks(running);

      expect(fire.mock.calls).toStrictEqual([[[shownTasks[2]]]]);
    });

    it('WHEN only tasks never shown or unknown are refreshed THEN nothing fires', () => {
      const running = runningOf([
        ['/other', ['b#build']],
        ['/gone', ['a#build']]
      ]);

      tree.refreshTasks(running);

      expect(fire).not.toHaveBeenCalled();
    });
  });
});
