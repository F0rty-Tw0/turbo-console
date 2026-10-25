import type { WorkspaceModel } from '@turbo-console/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { PackagesTree } from './packages-tree.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import type { AtomHostPorts } from '../common/atom-load.type.ts';
import type { TreeNode, TreePorts } from '../common/tree-node.type.ts';
import {
  BASE_SPEC_PATHS,
  ENDED_MATCHED,
  ENDED_MATCHING,
  FILE_A,
  OTHER_ENDED,
  PKG,
  ROOT,
  STILL_RUNNING,
  UMBRELLA_TICK
} from '../test/common/atom-load.const.ts';
import type { ChildrenOf, LoadsHarness, RunCase } from '../test/common/atom-load.type.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { FILE_TREE_NODE_STUB, PLAIN_TASK_TREE_NODE_STUB, UMBRELLA_TREE_NODE_STUB } from '../test/stubs/tree-node.stub.ts';
import { WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';
import { dryRunAt, dryStateOf, flush, loadsHarness, settleFailed, settleOk } from '../test/utils/atom-load.spec.util.ts';
import { atomModelOf } from '../test/utils/atom-model.spec.util.ts';
import { expandAll, loadedOf, nodeKeyed, runOf, umbrellaNodeOf } from '../test/utils/atom-tree.spec.util.ts';
import { SCRIPTS_HIDDEN_PORTS } from '../test/utils/tree-ports.spec.util.ts';

describe('FEATURE: packages tree Atomizer loads', () => {
  let h: LoadsHarness;
  let fire: Mock<TreePorts['fire']>;
  let store: RootStore;
  let tree: PackagesTree;

  const children: ChildrenOf = async (node) => tree.children(node);

  const treeOver = (model: WorkspaceModel): void => {
    const atom: AtomHostPorts = { binaryOf: h.binaryOf, dryRun: h.dryRun, results: h.results, log: h.log };
    const ports: TreePorts = {
      runs: () => undefined,
      ...SCRIPTS_HIDDEN_PORTS,
      atom,
      fire,
      treeVisible: new Map(),
      now: () => 7,
      wallNow: () => 7
    };

    tree = new PackagesTree(store, 'list', 'builtin', ports);
    store.set([ROOT_FOLDER_STUB], coordinatorMock);
    store.apply(ROOT, loadedOf(model));
  };

  beforeEach(() => {
    h = loadsHarness();
    fire = vi.fn<TreePorts['fire']>();
    store = new RootStore();
  });

  describe('GIVEN a root holding group e2e-ci of @fx/e2e', () => {
    beforeEach(() => {
      treeOver(atomModelOf(BASE_SPEC_PATHS));
    });

    describe('WHEN the umbrella is opened', () => {
      beforeEach(async () => {
        await tree.children(await umbrellaNodeOf(children));
      });

      it('THEN one dry run of the group umbrella task in that package starts', () => {
        const request = { tasks: ['e2e-ci'], packages: [PKG], singlePackage: false };

        expect(h.dryRun).toHaveBeenCalledExactlyOnceWith(TURBO_BINARY_STUB, request, expect.any(AbortSignal));
      });

      it('THEN one results scan of its files starts', () => {
        expect(h.results).toHaveBeenCalledOnce();
      });
    });

    it('WHEN the package, a file and a plain task are opened THEN no load starts', async () => {
      const packages = await tree.children();

      await tree.children(nodeKeyed(packages, PKG));
      await tree.children(FILE_TREE_NODE_STUB);
      await tree.children(PLAIN_TASK_TREE_NODE_STUB);

      expect(h.binaryOf).not.toHaveBeenCalled();
    });

    describe.each([
      { given: 'Loading', settle: async (): Promise<void> => Promise.resolve() },
      { given: 'Loaded', settle: async (): Promise<void> => settleOk(h, 0) },
      { given: 'Failed', settle: async (): Promise<void> => settleFailed(h) }
    ])('GIVEN an expanded group whose load is $given', ({ settle }) => {
      let umbrella: TreeNode;

      beforeEach(async () => {
        umbrella = await umbrellaNodeOf(children);
        await tree.children(umbrella);
        await settle();
      });

      it('WHEN ten elapsed ticks re-request its children THEN dryRun and the scan ran once', async () => {
        for (let tick = 0; tick < 10; tick += 1) {
          tree.refreshTasks(UMBRELLA_TICK);
          await tree.children(umbrella);
        }

        expect(h.dryRun).toHaveBeenCalledTimes(1);
        expect(h.results).toHaveBeenCalledTimes(1);
      });
    });

    describe('GIVEN an expanded group whose load is pending', () => {
      let umbrella: TreeNode;

      beforeEach(async () => {
        umbrella = await umbrellaNodeOf(children);
        await tree.children(umbrella);
        fire.mockClear();
      });

      it('WHEN the dry run settles THEN the cached umbrella node fires once', async () => {
        dryRunAt(h, 0).resolve([dryStateOf(FILE_A, 'HIT')]);
        await flush();

        expect(fire.mock.calls).toStrictEqual([[[umbrella]]]);
        expect(fire.mock.lastCall?.[0]).toContain(umbrella);
      });

      it('WHEN the tree is disposed THEN the pending dry run is aborted', () => {
        tree.dispose();

        expect(dryRunAt(h, 0).signal.aborted).toBe(true);
      });
    });

    it('WHEN a group never listed loads THEN nothing fires', async () => {
      await tree.children(UMBRELLA_TREE_NODE_STUB);
      fire.mockClear();
      await settleOk(h, 0);

      expect(fire).not.toHaveBeenCalled();
    });

    it('WHEN Refresh runs before any group was opened THEN no load starts', () => {
      tree.refreshAtoms();

      expect(h.dryRun).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a loaded group e2e-ci of @fx/e2e', () => {
    let umbrella: TreeNode;

    beforeEach(async () => {
      treeOver(atomModelOf(BASE_SPEC_PATHS));
      umbrella = await umbrellaNodeOf(children);
      await tree.children(umbrella);
      await settleOk(h, 0);
    });

    it.each<RunCase>([
      { when: 'a run of the package is still running', patch: STILL_RUNNING, calls: 1 },
      { when: 'a run of the package ended and its summary is matching', patch: ENDED_MATCHING, calls: 1 },
      { when: 'a run of the package ended and its summary match settled', patch: ENDED_MATCHED, calls: 2 },
      { when: 'a run of another package ended', patch: OTHER_ENDED, calls: 1 }
    ])('WHEN $when THEN dryRun ran $calls time(s)', ({ patch, calls }) => {
      tree.runChanged(runOf(patch));

      expect(h.dryRun).toHaveBeenCalledTimes(calls);
    });

    describe('WHEN the model reloads with the same ids', () => {
      beforeEach(() => {
        const after = atomModelOf(['tests/a.spec.ts', 'tests/b fails.spec.ts']);

        store.apply(ROOT, loadedOf(after));
        tree.refreshFor({ root: ROOT, before: atomModelOf(BASE_SPEC_PATHS), after, errorBefore: null, errorAfter: null });
      });

      it('THEN no load starts', () => {
        expect(h.dryRun).toHaveBeenCalledTimes(1);
      });

      it('THEN the umbrella keeps its cached count', () => {
        expect(tree.rowOf(umbrella).description).toBe('2 files · 1 cached');
      });
    });

    it('WHEN the model reloads without one file THEN the next open starts a second load', async () => {
      const after = atomModelOf(['tests/a.spec.ts']);

      store.apply(ROOT, loadedOf(after));
      tree.refreshFor({ root: ROOT, before: atomModelOf(BASE_SPEC_PATHS), after, errorBefore: null, errorAfter: null });
      await tree.children(umbrella);

      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });

    it('WHEN Refresh runs THEN a second load starts', () => {
      tree.refreshAtoms();

      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });

    it('WHEN the root is removed and added again THEN opening its group starts a second load', async () => {
      store.set([], coordinatorMock);
      tree.rootsChanged();
      store.set([ROOT_FOLDER_STUB], coordinatorMock);
      store.apply(ROOT, loadedOf(atomModelOf(BASE_SPEC_PATHS)));
      tree.rootsChanged();

      const reopened = await umbrellaNodeOf(children);

      await tree.children(reopened);

      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });
  });

  describe('GIVEN a root without Atomizer groups', () => {
    beforeEach(() => {
      treeOver(WORKSPACE_MODEL_STUB);
    });

    it('WHEN every row is opened THEN no binary is read for a load', async () => {
      await expandAll(children);

      expect(h.binaryOf).not.toHaveBeenCalled();
    });
  });
});
