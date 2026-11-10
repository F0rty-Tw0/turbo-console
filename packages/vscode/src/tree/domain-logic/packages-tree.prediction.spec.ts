import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { PackagesTree } from './packages-tree.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { PredictionLookup, PredictionView } from '../common/prediction.type.ts';
import type { TreeNode, TreePorts } from '../common/tree-node.type.ts';
import type { SharedPredictionFake } from '../test/common/prediction-load.type.ts';
import { sharedPredictionMock } from '../test/mocks/shared-prediction.mock.ts';
import { ICONS_STATE_STUB } from '../test/stubs/icons-state.stub.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { TREE_NODE_STUB } from '../test/stubs/tree-node.stub.ts';
import { loadedWith, packageNamed } from '../test/utils/tree-model.spec.util.ts';
import { SCRIPTS_HIDDEN_PORTS } from '../test/utils/tree-ports.spec.util.ts';

describe('FEATURE: packages tree cache prediction feed', () => {
  let shared: SharedPredictionFake;
  let fire: Mock<TreePorts['fire']>;
  let store: RootStore;
  let tree: PackagesTree;

  beforeEach(() => {
    shared = sharedPredictionMock();
    fire = vi.fn<TreePorts['fire']>();
    store = new RootStore();

    const ports: TreePorts = {
      runs: () => undefined,
      ...SCRIPTS_HIDDEN_PORTS,
      prediction: shared,
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

  describe('GIVEN a loaded /ws root with package a', () => {
    it('WHEN the top children load THEN packageShown is not called', async () => {
      await tree.children();

      expect(shared.packageShown).not.toHaveBeenCalled();
    });

    it('WHEN a package node is opened THEN packageShown gets its root and package name once', async () => {
      await tree.children();
      await tree.children(TREE_NODE_STUB);

      expect(shared.packageShown).toHaveBeenCalledExactlyOnceWith('/ws', 'a');
    });

    it('WHEN predictionChanged runs THEN the whole tree redraws once', () => {
      tree.predictionChanged();

      expect(fire).toHaveBeenCalledExactlyOnceWith(undefined);
    });

    it('WHEN a run settles THEN runEnded gets its root', () => {
      tree.runChanged({ ...RUN_ENTRY_STUB, state: 'passed', matching: false });

      expect(shared.runEnded).toHaveBeenCalledExactlyOnceWith('/ws');
    });

    it('WHEN the model of a root changes THEN modelChanged gets that change once', () => {
      store.apply('/ws', loadedWith([packageNamed('a'), packageNamed('b')]));

      expect(shared.modelChanged).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ root: '/ws' }));
    });

    it('WHEN refreshAtoms runs THEN the shared prediction refreshes all once', () => {
      tree.refreshAtoms();

      expect(shared.refreshAll).toHaveBeenCalledOnce();
    });

    it('WHEN rootsChanged runs THEN rootsKept gets the set of the store roots', () => {
      tree.rootsChanged();

      expect(shared.rootsKept).toHaveBeenCalledExactlyOnceWith(new Set(['/ws']));
    });

    it('WHEN dispose runs THEN the shared prediction is disposed once', () => {
      tree.dispose();

      expect(shared.dispose).toHaveBeenCalledOnce();
    });

    it('WHEN the shared view holds a HIT only for root /ws and package a THEN the row of a#build says cached', async () => {
      const settledAt = new Date(2026, 10, 9, 14, 5).getTime();
      const taskNode: TreeNode = { kind: 'task', id: 'task:/ws\0a#build', root: '/ws', key: 'a#build', packageName: 'a' };
      const view: PredictionView = { settledAt, tasks: new Map([['a#build', 'HIT']]) };
      const viewOf: PredictionLookup = (root, packageName) => {
        const isPackageA = root === '/ws' && packageName === 'a';

        return isPackageA ? view : null;
      };

      vi.mocked(shared.view).mockImplementation(viewOf);
      await tree.children();
      await tree.children(TREE_NODE_STUB);

      const row = tree.rowOf(taskNode);

      expect(row.description).toBe('cached');
    });
  });
});
