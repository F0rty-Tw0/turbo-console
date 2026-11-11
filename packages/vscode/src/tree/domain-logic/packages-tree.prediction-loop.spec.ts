import { beforeEach, describe, expect, it } from 'vitest';

import { PackagesTree } from './packages-tree.ts';
import { sharedPredictionOf } from './shared-prediction.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { SharedPrediction } from '../common/prediction.type.ts';
import type { TreeNode, TreePorts, TreeRefresh } from '../common/tree-node.type.ts';
import type { DeferredDryRun } from '../test/common/atom-load.type.ts';
import type { PredictionHarness } from '../test/common/prediction-load.type.ts';
import { ICONS_STATE_STUB } from '../test/stubs/icons-state.stub.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { TREE_NODE_STUB } from '../test/stubs/tree-node.stub.ts';
import { dryStateOf, flush } from '../test/utils/atom-load.spec.util.ts';
import { predictionHarness } from '../test/utils/prediction-load.spec.util.ts';
import { loadedWith, packageNamed } from '../test/utils/tree-model.spec.util.ts';
import { SCRIPTS_HIDDEN_PORTS } from '../test/utils/tree-ports.spec.util.ts';

/** How a spec settles a dry run; settling one twice does nothing. */
type DryRunOutcome = (run: DeferredDryRun) => void;

/** The real shared prediction and the real tree over one store, and every refresh the tree fired. */
type LoopFixture = {
  readonly h: PredictionHarness;
  readonly shared: SharedPrediction;
  readonly tree: PackagesTree;
  readonly fired: TreeRefresh[];
};

const MAX_ROUNDS = 50;

const TASK_A: TreeNode = { kind: 'task', id: 'task:/ws\0a#build', root: '/ws', key: 'a#build', packageName: 'a' };

const succeed: DryRunOutcome = (run) => {
  run.resolve([dryStateOf('a#build', 'HIT')]);
};

const fail: DryRunOutcome = (run) => {
  run.reject(new Error('boom'));
};

/** What VS Code asks again after a refresh: a whole-tree redraw re-asks the opened package a, a node list re-asks each node. */
const reAskedOf = (refresh: TreeRefresh): TreeNode[] => {
  if (refresh === undefined) return [TREE_NODE_STUB];

  if (Array.isArray(refresh)) return refresh;

  return [refresh];
};

/**
 * `sharedPredictionOf` and `PackagesTree` over a `/ws` root holding package a; `fire` acts like VS Code with package a
 * expanded, so every fired package node is asked for its children again. `trees` holds the tree once it is built, since
 * `fire` is a port the tree is built with.
 */
const loopFixtureOf = (): LoopFixture => {
  const h = predictionHarness();
  const store = new RootStore();
  const shared = sharedPredictionOf(store, h.ports);
  const fired: TreeRefresh[] = [];
  const trees: PackagesTree[] = [];
  const reAsk = (node: TreeNode): void => {
    if (node.kind !== 'pkg') return;

    for (const tree of trees) void tree.children(node);
  };
  const fire = (refresh: TreeRefresh): void => {
    fired.push(refresh);
    reAskedOf(refresh).forEach(reAsk);
  };
  const ports: TreePorts = {
    runs: () => undefined,
    ...SCRIPTS_HIDDEN_PORTS,
    prediction: shared,
    fire,
    treeVisible: new Map(),
    now: () => 7,
    wallNow: () => 7
  };
  const tree = new PackagesTree(store, 'list', ICONS_STATE_STUB, ports);

  trees.push(tree);
  store.set([ROOT_FOLDER_STUB], coordinatorMock);
  store.apply('/ws', loadedWith([packageNamed('a')]));

  const fixture: LoopFixture = { h, shared, tree, fired };

  return fixture;
};

/** Up to `MAX_ROUNDS` rounds of: fire the due timers, settle every dry run with `outcome`, let the tree re-ask; stops once no timer waits. */
const settleRounds = async (h: PredictionHarness, outcome: DryRunOutcome): Promise<void> => {
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    h.fire();
    h.dryRuns.forEach(outcome);
    await flush();

    const isIdle = h.pendingTimers().length === 0;

    if (isIdle) return;
  }
};

/** Prediction on, the top level listed, package a opened, then every load settled with `outcome`. */
const openPackageA = async (fixture: LoopFixture, outcome: DryRunOutcome): Promise<void> => {
  fixture.shared.toggled(true);
  await fixture.tree.children();
  await fixture.tree.children(TREE_NODE_STUB);
  await settleRounds(fixture.h, outcome);
};

describe('FEATURE: packages tree cache prediction redraw loop', () => {
  let fixture: LoopFixture;

  beforeEach(() => {
    fixture = loopFixtureOf();
  });

  describe('GIVEN package a opened and its dry run succeeded', () => {
    beforeEach(async () => {
      await openPackageA(fixture, succeed);
    });

    it('WHEN the tree re-asks package a after the redraw THEN one dry run ran', () => {
      expect(fixture.h.dryRun).toHaveBeenCalledOnce();
    });

    it('WHEN the tree re-asks package a after the redraw THEN no timer waits', () => {
      expect(fixture.h.pendingTimers()).toStrictEqual([]);
    });

    it('WHEN the row of a#build is built THEN it says cached', () => {
      const row = fixture.tree.rowOf(TASK_A);

      expect(row.description).toBe('cached');
    });

    it('WHEN five runs of /ws end together THEN one more dry run runs', async () => {
      for (let i = 0; i < 5; i += 1) fixture.tree.runChanged({ ...RUN_ENTRY_STUB, taskId: `a#t${i}`, state: 'passed' });
      await settleRounds(fixture.h, succeed);

      expect(fixture.h.dryRun).toHaveBeenCalledTimes(2);
    });

    it('WHEN prediction is toggled off and the tree redraws THEN the row of a#build loses the word', () => {
      fixture.shared.toggled(false);
      fixture.tree.loadsToggled();

      const row = fixture.tree.rowOf(TASK_A);

      expect(row.description).toBe('');
    });
  });

  describe('GIVEN package a opened and its dry run failed', () => {
    beforeEach(async () => {
      await openPackageA(fixture, fail);
    });

    it('WHEN the tree re-asks package a after the redraw THEN one dry run ran', () => {
      expect(fixture.h.dryRun).toHaveBeenCalledOnce();
    });

    it('WHEN the tree re-asks package a after the redraw THEN no timer waits', () => {
      expect(fixture.h.pendingTimers()).toStrictEqual([]);
    });

    it('WHEN the failure settles THEN the tree fired package a once', () => {
      expect(fixture.fired).toStrictEqual([[TREE_NODE_STUB]]);
    });
  });
});
