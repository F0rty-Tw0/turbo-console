import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PackagesTree } from './packages-tree.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { Span } from '../../shared/common/span.type.ts';
import type { TreeNode, TreePorts } from '../common/tree-node.type.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { loadedWith, packageNamed } from '../test/utils/tree-model.spec.util.ts';

const OTHER_FOLDER: RootFolder = { root: '/other', name: 'other' };

const A = packageNamed('a');

const B = packageNamed('b');

const A_CHANGED = packageNamed('a', 'tsc -b');

type Fixture = {
  readonly store: RootStore;
  readonly tree: PackagesTree;
  readonly fire: TreePorts['fire'];
  readonly treeVisible: Map<string, Span>;
};

const fixtureOf = (folders: RootFolder[]): Fixture => {
  const store = new RootStore();
  const fire = vi.fn();
  const treeVisible = new Map<string, Span>();
  const ports: TreePorts = { runs: () => undefined, fire, treeVisible, now: () => 7 };
  const tree = new PackagesTree(store, 'list', ports);

  store.set(folders, coordinatorMock);
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

describe('FEATURE: packages tree', () => {
  describe('GIVEN a single root listing packages a and b', () => {
    let fixture: Fixture;
    let shown: TreeNode[];

    beforeEach(async () => {
      fixture = fixtureOf([ROOT_FOLDER_STUB]);
      fixture.store.apply('/ws', loadedWith([A, B]));
      shown = await fixture.tree.children();
      vi.mocked(fixture.fire).mockClear();
    });

    it('WHEN the top level is listed THEN it holds one node per package', () => {
      const keys = shown.map((node) => node.key);

      expect(keys).toStrictEqual(['a', 'b']);
    });

    it('WHEN the top level is listed THEN the root was asked for its first children', () => {
      const entry = fixture.store.get('/ws');

      expect(entry?.coordinator.firstChildren).toHaveBeenCalledOnce();
    });

    it('WHEN the top level is listed THEN its visible span is closed', () => {
      const span = fixture.treeVisible.get('/ws');

      expect(span).toStrictEqual({ start: 7, end: 7 });
    });

    describe('WHEN only package a changes', () => {
      beforeEach(() => {
        fixture.store.apply('/ws', loadedWith([A_CHANGED, B]));
      });

      it('THEN exactly the node of a fires', () => {
        const fired = vi.mocked(fixture.fire).mock.calls;

        expect(fired).toStrictEqual([[named(shown, 'a')]]);
      });

      it('THEN package b keeps its node object', async () => {
        const after = await fixture.tree.children();

        expect(named(after, 'b')).toBe(named(shown, 'b'));
      });
    });

    describe('WHEN package b is removed', () => {
      beforeEach(() => {
        fixture.store.apply('/ws', loadedWith([A]));
      });

      it('THEN the whole tree fires', () => {
        expect(fixture.fire).toHaveBeenCalledExactlyOnceWith(undefined);
      });

      it('THEN b comes back as a new node object once it is added again', async () => {
        fixture.store.apply('/ws', loadedWith([A, B]));

        const after = await fixture.tree.children();

        expect(named(after, 'b')).not.toBe(named(shown, 'b'));
      });
    });

    describe('WHEN a task of package a is shown', () => {
      let task: TreeNode;

      beforeEach(async () => {
        const tasks = await fixture.tree.children(named(shown, 'a'));

        task = named(tasks, 'a#build');
      });

      it('THEN refreshing that task fires exactly its node', () => {
        fixture.tree.refreshTask('/ws', 'a#build');

        expect(fixture.fire).toHaveBeenCalledExactlyOnceWith(task);
      });

      it('THEN refreshing a task never shown fires nothing', () => {
        fixture.tree.refreshTask('/ws', 'b#build');

        expect(fixture.fire).not.toHaveBeenCalled();
      });

      it("THEN the task's current row is built from the model", () => {
        const row = fixture.tree.rowOf(task);

        expect(row.label).toBe('build');
      });
    });

    describe('WHEN the mode changes to folders', () => {
      beforeEach(() => {
        fixture.tree.setMode('folders');
      });

      it('THEN the whole tree fires', () => {
        expect(fixture.fire).toHaveBeenCalledExactlyOnceWith(undefined);
      });

      it('THEN the top level lists the packages folder', async () => {
        const after = await fixture.tree.children();
        const keys = after.map((node) => node.key);

        expect(keys).toStrictEqual(['packages']);
      });
    });

    describe('WHEN the root is removed', () => {
      beforeEach(() => {
        fixture.store.set([], coordinatorMock);
        fixture.tree.rootsChanged();
      });

      it('THEN the whole tree fires', () => {
        expect(fixture.fire).toHaveBeenCalledExactlyOnceWith(undefined);
      });

      it('THEN a package node of it lists nothing', async () => {
        const children = await fixture.tree.children(named(shown, 'a'));

        expect(children).toStrictEqual([]);
      });

      it('THEN a package node of it reads as a loading row', () => {
        const row = fixture.tree.rowOf(named(shown, 'a'));

        expect(row.icon.id).toBe('loading~spin');
      });
    });
  });

  describe('GIVEN a single root whose model lists one name twice', () => {
    it('WHEN the top level is listed THEN the name has one node', async () => {
      const fixture = fixtureOf([ROOT_FOLDER_STUB]);

      fixture.store.apply('/ws', loadedWith([A, A]));

      const shown = await fixture.tree.children();

      expect(shown).toHaveLength(1);
    });
  });

  describe('GIVEN a single root with nothing loaded yet', () => {
    it('WHEN the top level is listed THEN its visible span stays open', async () => {
      const fixture = fixtureOf([ROOT_FOLDER_STUB]);

      await fixture.tree.children();

      expect(fixture.treeVisible.get('/ws')).toStrictEqual({ start: 7, end: null });
    });
  });

  describe('GIVEN two roots', () => {
    let fixture: Fixture;
    let roots: TreeNode[];

    beforeEach(async () => {
      fixture = fixtureOf([ROOT_FOLDER_STUB, OTHER_FOLDER]);
      fixture.store.apply('/ws', loadedWith([A]));
      roots = await fixture.tree.children();
      vi.mocked(fixture.fire).mockClear();
    });

    it('WHEN the top level is listed THEN it holds one node per root', () => {
      const ids = roots.map((node) => node.id);

      expect(ids).toStrictEqual(['root:/ws', 'root:/other']);
    });

    it('WHEN a root is opened THEN it lists its packages', async () => {
      const children = await fixture.tree.children(named(roots, '/ws'));
      const keys = children.map((node) => node.key);

      expect(keys).toStrictEqual(['a']);
    });

    it('WHEN a package is added to a root THEN only that root node fires', () => {
      fixture.store.apply('/ws', loadedWith([A, B]));

      expect(fixture.fire).toHaveBeenCalledExactlyOnceWith(named(roots, '/ws'));
    });

    it('WHEN two structural changes come in THEN the same root node fires both times', () => {
      fixture.store.apply('/ws', loadedWith([A, B]));
      fixture.store.apply('/ws', loadedWith([B]));

      const fired = vi.mocked(fixture.fire).mock.calls;
      const root = named(roots, '/ws');

      expect(fired).toStrictEqual([[root], [root]]);
    });
  });
});
