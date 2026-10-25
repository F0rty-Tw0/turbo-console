import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { AtomTree } from './atom-tree.ts';
import type { RootChange } from '../../roots/common/coordinator.type.ts';
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
  STILL_RUNNING
} from '../test/common/atom-load.const.ts';
import type { LoadsHarness, NodeCase, RunCase } from '../test/common/atom-load.type.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import {
  FILE_TREE_NODE_STUB,
  PLAIN_TASK_TREE_NODE_STUB,
  TREE_NODE_STUB,
  UMBRELLA_TREE_NODE_STUB
} from '../test/stubs/tree-node.stub.ts';
import { dryRunAt, dryStateOf, flush, loadsHarness, settleOk } from '../test/utils/atom-load.spec.util.ts';
import { atomModelOf } from '../test/utils/atom-model.spec.util.ts';
import { loadedOf, runOf } from '../test/utils/atom-tree.spec.util.ts';

const PACKAGELESS_TASK_NODE: TreeNode = { ...UMBRELLA_TREE_NODE_STUB, packageName: null };

const NOT_UMBRELLA_CASES: NodeCase[] = [
  { when: 'a package row', node: TREE_NODE_STUB },
  { when: 'a file row', node: FILE_TREE_NODE_STUB },
  { when: 'a plain task row', node: PLAIN_TASK_TREE_NODE_STUB },
  { when: 'a task row without a package', node: PACKAGELESS_TASK_NODE }
];

describe('FEATURE: atom tree', () => {
  let h: LoadsHarness;
  let fire: Mock<TreePorts['fire']>;
  let cache: Map<string, TreeNode>;
  let store: RootStore;
  let atoms: AtomTree;

  const changeTo = (paths: string[]): RootChange => {
    const before = atomModelOf(BASE_SPEC_PATHS);
    const after = atomModelOf(paths);
    const change: RootChange = { root: ROOT, before, after, errorBefore: null, errorAfter: null };

    return change;
  };

  beforeEach(() => {
    h = loadsHarness();
    fire = vi.fn<TreePorts['fire']>();
    cache = new Map();
    store = new RootStore();

    const atom: AtomHostPorts = { binaryOf: h.binaryOf, dryRun: h.dryRun, results: h.results, log: h.log };

    store.set([ROOT_FOLDER_STUB], coordinatorMock);
    store.apply(ROOT, loadedOf(atomModelOf(BASE_SPEC_PATHS)));
    atoms = new AtomTree(store, cache, { atom, fire });
  });

  describe('GIVEN a root holding group e2e-ci of @fx/e2e', () => {
    describe('WHEN the children of the group umbrella are requested', () => {
      beforeEach(() => {
        atoms.childrenRequested(UMBRELLA_TREE_NODE_STUB);
      });

      it('THEN one dry run of that group in that package starts', () => {
        const request = { tasks: ['e2e-ci'], packages: [PKG], singlePackage: false };

        expect(h.dryRun).toHaveBeenCalledExactlyOnceWith(TURBO_BINARY_STUB, request, expect.any(AbortSignal));
      });

      it('THEN one results scan starts', () => {
        expect(h.results).toHaveBeenCalledOnce();
      });
    });

    it.each(NOT_UMBRELLA_CASES)('WHEN the children of $when are requested THEN no load starts', ({ node }) => {
      atoms.childrenRequested(node);

      expect(h.binaryOf).not.toHaveBeenCalled();
    });

    it('WHEN Refresh runs before any group was opened THEN no load starts', () => {
      atoms.refreshAll();

      expect(h.dryRun).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a loaded group', () => {
    beforeEach(async () => {
      atoms.childrenRequested(UMBRELLA_TREE_NODE_STUB);
      await settleOk(h, 0);
    });

    it.each<RunCase>([
      { when: 'a run of the package is still running', patch: STILL_RUNNING, calls: 1 },
      { when: 'a run of the package ended and its summary is matching', patch: ENDED_MATCHING, calls: 1 },
      { when: 'a run of the package ended and its summary match settled', patch: ENDED_MATCHED, calls: 2 },
      { when: 'a run of another package ended', patch: OTHER_ENDED, calls: 1 }
    ])('WHEN $when THEN dryRun ran $calls time(s)', ({ patch, calls }) => {
      atoms.runChanged(runOf(patch));

      expect(h.dryRun).toHaveBeenCalledTimes(calls);
    });

    it('WHEN Refresh runs THEN a second load starts', () => {
      atoms.refreshAll();

      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });

    it('WHEN the model changed to the same ids THEN no second load starts', () => {
      atoms.modelChanged(changeTo(BASE_SPEC_PATHS));
      atoms.childrenRequested(UMBRELLA_TREE_NODE_STUB);

      expect(h.dryRun).toHaveBeenCalledTimes(1);
    });

    it('WHEN the model changed to other ids THEN the next children request starts a second load', () => {
      atoms.modelChanged(changeTo(['tests/a.spec.ts']));
      atoms.childrenRequested(UMBRELLA_TREE_NODE_STUB);

      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });

    it('WHEN the roots changed and the root is kept THEN no second load starts', () => {
      atoms.rootsChanged();
      atoms.childrenRequested(UMBRELLA_TREE_NODE_STUB);

      expect(h.dryRun).toHaveBeenCalledTimes(1);
    });

    it('WHEN the roots changed and the root is gone and back THEN the next children request starts a second load', () => {
      store.set([], coordinatorMock);
      atoms.rootsChanged();
      store.set([ROOT_FOLDER_STUB], coordinatorMock);
      store.apply(ROOT, loadedOf(atomModelOf(BASE_SPEC_PATHS)));
      atoms.childrenRequested(UMBRELLA_TREE_NODE_STUB);

      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });

    it('WHEN the view is read THEN it carries the loaded dry-run states', () => {
      const view = atoms.view(ROOT, PKG);

      expect(view.dryRun?.get(FILE_A)).toBe('HIT');
    });
  });

  describe('GIVEN a group whose umbrella node is cached', () => {
    beforeEach(() => {
      cache.set(UMBRELLA_TREE_NODE_STUB.id, UMBRELLA_TREE_NODE_STUB);
      atoms.childrenRequested(UMBRELLA_TREE_NODE_STUB);
    });

    it('WHEN its dry run settles THEN that node fires once, alone in one event', async () => {
      dryRunAt(h, 0).resolve([dryStateOf(FILE_A, 'HIT')]);
      await flush();

      expect(fire.mock.calls).toStrictEqual([[[UMBRELLA_TREE_NODE_STUB]]]);
    });

    it('WHEN the model changed to other ids THEN that node fires', () => {
      atoms.modelChanged(changeTo(['tests/a.spec.ts']));

      expect(fire).toHaveBeenCalledExactlyOnceWith([UMBRELLA_TREE_NODE_STUB]);
    });
  });

  describe('GIVEN a group whose umbrella node is not cached', () => {
    it('WHEN its dry run settles THEN nothing fires', async () => {
      atoms.childrenRequested(UMBRELLA_TREE_NODE_STUB);
      dryRunAt(h, 0).resolve([dryStateOf(FILE_A, 'HIT')]);
      await flush();

      expect(fire).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a pending load', () => {
    it('WHEN the atoms are disposed THEN the load aborts', () => {
      atoms.childrenRequested(UMBRELLA_TREE_NODE_STUB);
      atoms.dispose();

      expect(dryRunAt(h, 0).signal.aborted).toBe(true);
    });
  });
});
