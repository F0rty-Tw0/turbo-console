import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { PackagesTree } from './packages-tree.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { LiveIds, RunEntry } from '../../run/common/run.type.ts';
import type { TreeNode, TreePorts } from '../common/tree-node.type.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { SHARED_ATOMS_STUB } from '../test/stubs/shared-atoms.stub.ts';
import { loadedWith, packageNamed } from '../test/utils/tree-model.spec.util.ts';
import { SCRIPT_PACKAGE, SCRIPT_TASK, scriptRunOf } from '../test/utils/tree-refresher.spec.util.ts';

const LIVE: ReadonlySet<string> = new Set([SCRIPT_TASK.id]);

const NOBODY: ReadonlySet<string> = new Set();

const named = (nodes: TreeNode[], key: string): TreeNode => {
  const found = nodes.find((node) => node.key === key);

  if (found === undefined) throw new Error(`no node ${key}`);

  return found;
};

type Opened = {
  readonly group: TreeNode;
  readonly script: TreeNode;
};

describe('FEATURE: the Scripts group in the packages tree', () => {
  let tree: PackagesTree;
  let fire: Mock<TreePorts['fire']>;
  let live: ReadonlySet<string>;
  let run: RunEntry | undefined;

  /** Opens package `s`, then its group, then returns the group and its one script node. */
  const open = async (): Promise<Opened> => {
    const shown = await tree.children();
    const children = await tree.children(named(shown, 's'));
    const group = named(children, 's');
    const scripts = await tree.children(group);
    const opened: Opened = { group, script: named(scripts, SCRIPT_TASK.id) };

    return opened;
  };

  beforeEach(() => {
    const store = new RootStore();
    const runningIds: LiveIds = () => live;

    live = NOBODY;
    run = undefined;
    fire = vi.fn<TreePorts['fire']>();

    const ports: TreePorts = {
      runs: () => run,
      scriptsShown: () => false,
      runningIds,
      fire,
      treeVisible: new Map(),
      now: () => 7,
      wallNow: () => 7,
      atom: SHARED_ATOMS_STUB
    };

    tree = new PackagesTree(store, 'list', 'builtin', ports);
    store.set([ROOT_FOLDER_STUB], coordinatorMock);
    store.apply('/ws', loadedWith([packageNamed('a'), SCRIPT_PACKAGE]));
  });

  describe('GIVEN scripts hidden and nothing running', () => {
    it('WHEN the tree is listed THEN the scripts-only package has no row', async () => {
      const shown = await tree.children();

      expect(shown.map((node) => node.key)).toStrictEqual(['a']);
    });
  });

  describe('GIVEN scripts hidden and a script run that has started', () => {
    beforeEach(() => {
      live = LIVE;
      run = scriptRunOf('/ws');
      tree.runChanged(run);
      fire.mockClear();
    });

    it('WHEN the tree is listed THEN the package shows a Scripts group holding the live script', async () => {
      const { group, script } = await open();

      expect([group.id, script.id]).toStrictEqual(['scripts:/ws\0s', 'task:/ws\0s#lint']);
    });

    it('WHEN the run ends THEN the root redraws and the group and script nodes leave the cache', async () => {
      const before = await open();

      live = NOBODY;
      run = scriptRunOf('/ws', { state: 'stopped', endedAt: 2000 });
      tree.runChanged(run);

      expect(fire).toHaveBeenCalledWith(undefined);

      live = LIVE;

      const after = await open();

      expect([after.group === before.group, after.script === before.script]).toStrictEqual([false, false]);
    });

    it('WHEN the run ends THEN the same run reported again redraws nothing', async () => {
      await open();
      live = NOBODY;
      run = scriptRunOf('/ws', { state: 'stopped', endedAt: 2000 });
      tree.runChanged(run);
      fire.mockClear();

      tree.runChanged(run);

      expect(fire).not.toHaveBeenCalled();
    });
  });
});
