import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PackagesTree } from './packages-tree.ts';
import type { Coordinator } from '../../roots/common/coordinator.type.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { Span } from '../../shared/common/span.type.ts';
import type { TreeNode, TreePorts } from '../common/tree-node.type.ts';
import type { TreeMode } from '../common/tree-row.type.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { loadedWith, packageNamed } from '../test/utils/tree-model.spec.util.ts';

const A = packageNamed('a');

const B = packageNamed('b');

const A_CHANGED = packageNamed('a', 'tsc -b');

type Fixture = {
  readonly store: RootStore;
  readonly tree: PackagesTree;
  readonly fire: TreePorts['fire'];
  readonly treeVisible: Map<string, Span>;
};

/** A tree over a real store holding `folders`, redrawn on every store change like the provider does; `fire` is a spy. */
const fixtureOf = (folders: RootFolder[], mode: TreeMode, make: (folder: RootFolder) => Coordinator): Fixture => {
  const store = new RootStore();
  const fire = vi.fn();
  const treeVisible = new Map<string, Span>();
  const ports: TreePorts = { runs: () => undefined, fire, treeVisible, now: () => 7, wallNow: () => 7 };
  const tree = new PackagesTree(store, mode, ports);

  store.set(folders, make);
  store.onDidChange((change) => {
    tree.refreshFor(change);
  });

  const fixture: Fixture = { store, tree, fire, treeVisible };

  return fixture;
};

const named = (nodes: TreeNode[], key: string): TreeNode => {
  const found = nodes.find((node) => node.key === key);

  if (found === undefined) throw new Error(`no node ${key}`);

  return found;
};

describe('FEATURE: packages tree node cache', () => {
  describe('GIVEN the list view showing the tasks of package b', () => {
    let fixture: Fixture;
    let task: TreeNode;

    beforeEach(async () => {
      fixture = fixtureOf([ROOT_FOLDER_STUB], 'list', coordinatorMock);
      fixture.store.apply('/ws', loadedWith([A, B]));

      const shown = await fixture.tree.children();
      const tasks = await fixture.tree.children(named(shown, 'b'));

      task = named(tasks, 'b#build');
      fixture.store.apply('/ws', loadedWith([A_CHANGED, B]));
      vi.mocked(fixture.fire).mockClear();
    });

    it('WHEN only package a changed THEN refreshing a task of b fires the node shown before', () => {
      fixture.tree.refreshTask('/ws', 'b#build');

      expect(fixture.fire).toHaveBeenCalledExactlyOnceWith(task);
    });
  });

  describe('GIVEN the folders view showing the tasks of package b', () => {
    let fixture: Fixture;
    let dir: TreeNode;
    let pkg: TreeNode;
    let task: TreeNode;

    beforeEach(async () => {
      fixture = fixtureOf([ROOT_FOLDER_STUB], 'folders', coordinatorMock);
      fixture.store.apply('/ws', loadedWith([A, B]));

      const top = await fixture.tree.children();

      dir = named(top, 'packages');

      const packages = await fixture.tree.children(dir);

      pkg = named(packages, 'b');

      const tasks = await fixture.tree.children(pkg);

      task = named(tasks, 'b#build');
      fixture.store.apply('/ws', loadedWith([A_CHANGED, B]));
      vi.mocked(fixture.fire).mockClear();
    });

    it('WHEN only package a changed THEN refreshing a task of b fires the node shown before', () => {
      fixture.tree.refreshTask('/ws', 'b#build');

      expect(fixture.fire).toHaveBeenCalledExactlyOnceWith(task);
    });

    it('WHEN only package a changed THEN package b keeps its node object', async () => {
      const packages = await fixture.tree.children(dir);

      expect(named(packages, 'b')).toBe(pkg);
    });

    it('WHEN the view goes to list and back THEN the folder comes back as a new node object', async () => {
      fixture.tree.setMode('list');
      fixture.tree.setMode('folders');

      const top = await fixture.tree.children();

      expect(named(top, 'packages')).not.toBe(dir);
    });
  });

  describe('GIVEN a root that was shown, removed and redrawn', () => {
    it('WHEN it is added again THEN its packages come back as new node objects', async () => {
      const fixture = fixtureOf([ROOT_FOLDER_STUB], 'list', coordinatorMock);

      fixture.store.apply('/ws', loadedWith([A, B]));

      const shown = await fixture.tree.children();

      fixture.store.set([], coordinatorMock);
      fixture.tree.rootsChanged();
      fixture.store.set([ROOT_FOLDER_STUB], coordinatorMock);
      fixture.store.apply('/ws', loadedWith([A, B]));

      const after = await fixture.tree.children();

      expect(named(after, 'a')).not.toBe(named(shown, 'a'));
    });
  });
});
