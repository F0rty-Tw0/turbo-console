import type { PackageNode, TaskNode } from '@turbo-console/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PackagesTree } from './packages-tree.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { TreeNode, TreePorts } from '../common/tree-node.type.ts';
import { ICONS_STATE_STUB } from '../test/stubs/icons-state.stub.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { TASK_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';
import { loadedWith, packageNamed } from '../test/utils/tree-model.spec.util.ts';
import { SCRIPTS_HIDDEN_PORTS } from '../test/utils/tree-ports.spec.util.ts';
import { taskRunOf } from '../test/utils/tree-refresher.spec.util.ts';

const SCOPED = packageNamed('@s/a');

const B = packageNamed('b');

const ATOM_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'b#atom', name: 'atom', kind: 'atom-file' };

const HIDDEN_B: PackageNode = { ...B, tasks: [ATOM_TASK] };

const EDITED_ATOM_TASK: TaskNode = { ...ATOM_TASK, command: 'edited' };

const EDITED_HIDDEN_B: PackageNode = { ...B, tasks: [EDITED_ATOM_TASK] };

type Fixture = {
  readonly store: RootStore;
  readonly tree: PackagesTree;
  readonly fire: TreePorts['fire'];
};

/** A single-root list tree over a real store, redrawn on every store change like the provider does. */
const fixtureOf = (): Fixture => {
  const store = new RootStore();
  const fire = vi.fn();
  const ports: TreePorts = {
    runs: () => undefined,
    ...SCRIPTS_HIDDEN_PORTS,
    fire,
    treeVisible: new Map(),
    now: () => 7,
    wallNow: () => 7
  };
  const tree = new PackagesTree(store, 'list', ICONS_STATE_STUB, ports);

  store.set([ROOT_FOLDER_STUB], coordinatorMock);
  store.onDidChange((change) => {
    tree.refreshFor(change);
  });

  const fixture: Fixture = { store, tree, fire };

  return fixture;
};

const named = (nodes: TreeNode[], key: string): TreeNode => {
  const found = nodes.find((node) => node.key === key);

  if (found === undefined) throw new Error(`no node ${key}`);

  return found;
};

describe('FEATURE: package scopes in the packages tree', () => {
  describe('GIVEN a single root listing a scoped and an unscoped package', () => {
    let fixture: Fixture;
    let shown: TreeNode[];

    beforeEach(async () => {
      fixture = fixtureOf();
      fixture.store.apply('/ws', loadedWith([SCOPED, B]));
      shown = await fixture.tree.children();
      vi.mocked(fixture.fire).mockClear();
    });

    it('WHEN nothing was set THEN scopes are hidden and the scoped label is its bare name', () => {
      const row = fixture.tree.rowOf(named(shown, '@s/a'));

      expect([fixture.tree.isScopeShown(), row.label]).toStrictEqual([false, 'a']);
    });

    describe('WHEN scopes are shown', () => {
      beforeEach(() => {
        fixture.tree.setScopeShown(true);
      });

      it('THEN the whole tree redraws once', () => {
        expect(fixture.fire).toHaveBeenCalledExactlyOnceWith(undefined);
      });

      it('THEN the scoped label is its full name', () => {
        const row = fixture.tree.rowOf(named(shown, '@s/a'));

        expect([fixture.tree.isScopeShown(), row.label]).toStrictEqual([true, '@s/a']);
      });
    });
  });

  describe('GIVEN a single root with the tasks of both packages on screen', () => {
    let fixture: Fixture;

    beforeEach(async () => {
      fixture = fixtureOf();
      fixture.store.apply('/ws', loadedWith([SCOPED, B]));

      const shown = await fixture.tree.children();

      await fixture.tree.children(named(shown, '@s/a'));
      await fixture.tree.children(named(shown, 'b'));
      fixture.store.apply('/ws', loadedWith([SCOPED, HIDDEN_B]));
      vi.mocked(fixture.fire).mockClear();
    });

    it('WHEN b is hidden and then changes again THEN nothing fires, as its node was pruned', () => {
      fixture.store.apply('/ws', loadedWith([SCOPED, EDITED_HIDDEN_B]));

      expect(fixture.fire).not.toHaveBeenCalled();
    });

    it('WHEN b is hidden and the task of the shown package runs THEN its kept task node fires, then its package node', () => {
      fixture.tree.runChanged(taskRunOf('/ws', '@s/a#build', '@s/a'));

      expect(fixture.fire).toHaveBeenCalledTimes(2);
    });
  });
});
