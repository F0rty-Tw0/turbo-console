import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { PackagesTree } from './packages-tree.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { TreeNode, TreePorts } from '../common/tree-node.type.ts';
import type { SharedAffectedFake } from '../test/common/shared-affected-fake.type.ts';
import { sharedAffectedMock } from '../test/mocks/shared-affected.mock.ts';
import { ICONS_STATE_STUB } from '../test/stubs/icons-state.stub.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { TREE_NODE_STUB } from '../test/stubs/tree-node.stub.ts';
import { loadedWith, packageNamed } from '../test/utils/tree-model.spec.util.ts';
import { SCRIPTS_HIDDEN_PORTS } from '../test/utils/tree-ports.spec.util.ts';

const ROOT_B: RootFolder = { root: '/other', name: 'other' };

const rootNodeOf = (root: string): TreeNode => {
  const node: TreeNode = { kind: 'root', id: `root:${root}`, root, key: root, packageName: null };

  return node;
};

describe('FEATURE: packages tree affected feed', () => {
  let shared: SharedAffectedFake;
  let fire: Mock<TreePorts['fire']>;
  let store: RootStore;
  let tree: PackagesTree;

  beforeEach(() => {
    shared = sharedAffectedMock();
    fire = vi.fn<TreePorts['fire']>();
    store = new RootStore();

    const ports: TreePorts = {
      runs: () => undefined,
      ...SCRIPTS_HIDDEN_PORTS,
      affected: shared,
      fire,
      treeVisible: new Map(),
      now: () => 7,
      wallNow: () => 7
    };

    tree = new PackagesTree(store, 'list', ICONS_STATE_STUB, ports);
    store.set([ROOT_FOLDER_STUB], coordinatorMock);
    store.apply('/ws', loadedWith([packageNamed('a')]));
    store.onDidChange((change) => {
      tree.refreshFor(change);
    });
  });

  describe('GIVEN a loaded single root /ws with package a', () => {
    it('WHEN the top children load THEN rootShown gets /ws once', async () => {
      await tree.children();

      expect(shared.rootShown).toHaveBeenCalledExactlyOnceWith('/ws');
    });

    it('WHEN the root has no model yet THEN rootShown is still called once', async () => {
      store.set([ROOT_FOLDER_STUB], coordinatorMock);

      await tree.children();

      expect(shared.rootShown).toHaveBeenCalledExactlyOnceWith('/ws');
    });

    it('WHEN a package node is opened THEN rootShown is not called', async () => {
      await tree.children(TREE_NODE_STUB);

      expect(shared.rootShown).not.toHaveBeenCalled();
    });

    it('WHEN the top level is asked twice THEN rootShown is called twice (the store, not the tree, ignores repeats)', async () => {
      await tree.children();
      tree.rowOf(TREE_NODE_STUB);
      await tree.children();

      expect(shared.rootShown).toHaveBeenCalledTimes(2);
    });

    it('WHEN loadsToggled runs THEN the whole tree redraws once', () => {
      tree.loadsToggled();

      expect(fire).toHaveBeenCalledExactlyOnceWith(undefined);
    });

    it('WHEN a run settles THEN the shared affected store is not touched', () => {
      tree.runChanged({ ...RUN_ENTRY_STUB, state: 'passed', matching: false });

      expect(shared.rootShown).not.toHaveBeenCalled();
      expect(shared.modelChanged).not.toHaveBeenCalled();
      expect(shared.refreshAll).not.toHaveBeenCalled();
      expect(shared.rootsKept).not.toHaveBeenCalled();
    });

    it('WHEN the model of a root changes THEN modelChanged gets that change once', () => {
      store.apply('/ws', loadedWith([packageNamed('a'), packageNamed('b')]));

      expect(shared.modelChanged).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ root: '/ws' }));
    });

    it('WHEN refreshAtoms runs THEN the shared affected store refreshes all once', () => {
      tree.refreshAtoms();

      expect(shared.refreshAll).toHaveBeenCalledOnce();
    });

    it('WHEN rootsChanged runs THEN rootsKept gets the set of the store roots', () => {
      tree.rootsChanged();

      expect(shared.rootsKept).toHaveBeenCalledExactlyOnceWith(new Set(['/ws']));
    });

    it('WHEN dispose runs THEN the shared affected store is disposed once', () => {
      tree.dispose();

      expect(shared.dispose).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN two loaded roots', () => {
    beforeEach(() => {
      store.set([ROOT_FOLDER_STUB, ROOT_B], coordinatorMock);
      store.apply('/ws', loadedWith([packageNamed('a')]));
      store.apply('/other', loadedWith([packageNamed('b')]));
    });

    it('WHEN the top children load THEN two root rows return and rootShown is not called', async () => {
      const nodes = await tree.children();

      expect(nodes.map((node) => node.kind)).toStrictEqual(['root', 'root']);
      expect(shared.rootShown).not.toHaveBeenCalled();
    });

    it('WHEN the /ws root node opens THEN rootShown gets /ws only, once', async () => {
      await tree.children(rootNodeOf('/ws'));

      expect(shared.rootShown).toHaveBeenCalledExactlyOnceWith('/ws');
    });
  });
});
