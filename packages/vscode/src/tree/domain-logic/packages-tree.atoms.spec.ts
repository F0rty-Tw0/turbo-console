import type { WorkspaceModel } from '@turbo-console/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { PackagesTree } from './packages-tree.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { AtomHostPorts } from '../common/atom-load.type.ts';
import type { TreeNode, TreePorts } from '../common/tree-node.type.ts';
import { FILE_A, PKG, ROOT, UMBRELLA_ID } from '../test/common/atom-loads.const.ts';
import type { ChildrenOf, LoadsHarness } from '../test/common/atom-loads.type.ts';
import { BASE_MODEL_STUB } from '../test/stubs/atom-loads.stub.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';
import { dryRunAt, dryStateOf, flush, loadsHarness, scanAt } from '../test/utils/atom-loads.spec.util.ts';
import { atomModelOf } from '../test/utils/atom-model.spec.util.ts';
import { loadedOf, nodeKeyed, umbrellaNodeOf } from '../test/utils/atom-tree.spec.util.ts';
import { SCRIPTS_HIDDEN_PORTS } from '../test/utils/tree-ports.spec.util.ts';

const FILE_NODE: TreeNode = { kind: 'task', id: `task:${ROOT}\0${FILE_A}`, root: ROOT, key: FILE_A, packageName: PKG };

const PLAIN_TASK_NODE: TreeNode = { kind: 'task', id: `task:${ROOT}\0a#build`, root: ROOT, key: 'a#build', packageName: 'a' };

const COLLAPSED_UMBRELLA_NODE: TreeNode = {
  kind: 'task',
  id: `task:${ROOT}\0${UMBRELLA_ID}`,
  root: ROOT,
  key: UMBRELLA_ID,
  packageName: PKG
};

const TICK = new Map([[ROOT, new Set([UMBRELLA_ID])]]);

/** Opens `node` and every row under it, as a user expanding the whole tree would. */
const expandAll = async (tree: PackagesTree, node?: TreeNode): Promise<void> => {
  const children = await tree.children(node);
  const walks = children.map(async (child) => expandAll(tree, child));

  await Promise.all(walks);
};

const settleOk = async (h: LoadsHarness, index: number): Promise<void> => {
  const states = [dryStateOf(FILE_A, 'HIT')];

  dryRunAt(h, index).resolve(states);
  scanAt(h, index).resolve(new Map());

  await flush();
};

const settleFailed = async (h: LoadsHarness): Promise<void> => {
  dryRunAt(h, 0).reject(new Error('dry-run boom'));
  scanAt(h, 0).reject(new Error('scan boom'));

  await flush();
};

type RunCase = {
  readonly when: string;
  readonly patch: Partial<RunEntry>;
  readonly calls: number;
};

const STILL_RUNNING: Partial<RunEntry> = { state: 'running' };

const ENDED_MATCHING: Partial<RunEntry> = { state: 'passed', matching: true };

const ENDED_MATCHED: Partial<RunEntry> = { state: 'passed' };

const OTHER_ENDED: Partial<RunEntry> = { state: 'passed', packageName: 'a', taskId: 'a#build' };

const runOf = (patch: Partial<RunEntry>): RunEntry => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, root: ROOT, taskId: FILE_A, packageName: PKG, ...patch };

  return entry;
};

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
      treeOver(BASE_MODEL_STUB);
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
      await tree.children(FILE_NODE);
      await tree.children(PLAIN_TASK_NODE);

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
          tree.refreshTasks(TICK);
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
      await tree.children(COLLAPSED_UMBRELLA_NODE);
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
      treeOver(BASE_MODEL_STUB);
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
        tree.refreshFor({ root: ROOT, before: BASE_MODEL_STUB, after, errorBefore: null, errorAfter: null });
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
      tree.refreshFor({ root: ROOT, before: BASE_MODEL_STUB, after, errorBefore: null, errorAfter: null });
      await tree.children(umbrella);

      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });

    it('WHEN Refresh runs THEN a second load starts', () => {
      tree.refreshAtoms();

      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });
  });

  describe('GIVEN a root without Atomizer groups', () => {
    beforeEach(() => {
      treeOver(WORKSPACE_MODEL_STUB);
    });

    it('WHEN every row is opened THEN no binary is read for a load', async () => {
      await expandAll(tree);

      expect(h.binaryOf).not.toHaveBeenCalled();
    });
  });
});
