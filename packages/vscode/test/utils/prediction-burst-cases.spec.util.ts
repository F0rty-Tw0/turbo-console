import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

import { packageOfTask, predictionRunsOf, taskWordOf, waitForWord } from './prediction-scene.spec.util.ts';
import { endedRun, startRun, taskNodeNamed } from './run-wait.spec.util.ts';
import { log, step, waitFor } from './suite-env.spec.util.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import type { ShownTask } from '../common/launch.type.ts';
import { BURST_RUNS, BURST_STAGGER_MS, CACHED_WORD, QUIET_WINDOW_MS, SETTLE_LIMIT_MS } from '../common/prediction.const.ts';
import type { PredictionScene } from '../common/prediction.type.ts';

const isIndependent = (task: ShownTask): boolean => task.visible && task.kind === 'task' && task.dependencies.length === 0;

const independentIdsOf = (scene: PredictionScene, packageName: string): string[] => {
  const own = scene.manifest.tasks.filter((task) => task.packageName === packageName && isIndependent(task));

  return own.map((task) => task.fullName).toSorted();
};

/** `BURST_RUNS` tasks that depend on nothing, so their runs are short and need no other run: `c`'s first, then `b`'s. */
const burstIdsOf = (scene: PredictionScene): string[] => {
  const { b, c } = scene.packages;
  const ofC = independentIdsOf(scene, c);
  const ofB = independentIdsOf(scene, b);
  const pool = [...ofC, ...ofB];

  if (pool.length < BURST_RUNS) throw new Error(`only ${pool.length} independent tasks in ${c} and ${b}`);

  return pool.slice(0, BURST_RUNS);
};

type Burst = {
  readonly ends: number[];
  readonly lastEnd: number;
};

/** Starts the runs `staggerMs` apart (0 is back to back), then waits for all of them; the ends are `performance.now()` times. */
const runStaggered = async (scene: PredictionScene, nodes: TreeNode[], staggerMs: number): Promise<Burst> => {
  const { api } = scene;
  const ends: number[] = [];
  const finishing: Promise<void>[] = [];
  const finish = async (node: TreeNode, launchedAt: number): Promise<void> => {
    await endedRun(api, node, launchedAt);
    ends.push(performance.now());
  };

  for (const node of nodes) {
    const launchedAt = await startRun(api, node);

    finishing.push(finish(node, launchedAt));
    await delay(staggerMs);
  }

  await Promise.all(finishing);

  const burst: Burst = { ends: ends.toSorted((left, right) => left - right), lastEnd: Math.max(...ends) };

  return burst;
};

const gapsOf = (ends: number[]): string => {
  const later = ends.slice(1);
  const gaps = later.map((end, index) => `${Math.round(end - (ends[index] ?? end))}`);

  return gaps.join(', ');
};

const wordsOf = async (scene: PredictionScene, taskIds: string[]): Promise<string[]> => {
  const words: string[] = [];

  for (const id of taskIds) words.push(await taskWordOf(scene.api, id));

  return words;
};

const nodesOf = async (scene: PredictionScene, taskIds: string[]): Promise<TreeNode[]> =>
  Promise.all(taskIds.map(async (id) => taskNodeNamed(scene.api, packageOfTask(id), id)));

/**
 * P6: `requeue` leaves the live ticket, so a run end aborts a dry run that is under way. Five short runs that end close
 * together must still end with every task that ran reading cached soon after the last end. Rows keep their old word until
 * a dry run settles, so the settle is the word flipping; some of these tasks never ran before, so none reads cached first.
 */
export const burstCase = async (scene: PredictionScene): Promise<void> => {
  const { api, counter } = scene;

  await step('P6: five run ends close together still settle the shown rows', async () => {
    const taskIds = burstIdsOf(scene);
    const nodes = await nodesOf(scene, taskIds);
    const before = await wordsOf(scene, taskIds);

    counter.reset();

    const burst = await runStaggered(scene, nodes, 0);

    for (const id of taskIds) await waitForWord(api, id, CACHED_WORD);

    const settleMs = Math.round(performance.now() - burst.lastEnd);

    await delay(QUIET_WINDOW_MS);

    const spawned = predictionRunsOf(scene).length;
    const aborted = counter.dryRunCloses().filter((close) => close.aborted).length;

    log(
      `P6: words before [${before.join(', ')}]; ${spawned} dry-run spawns, ${aborted} aborted; last end to every row cached ${settleMs} ms; gaps between run ends [${gapsOf(burst.ends)}] ms`
    );
    assert.ok(settleMs <= SETTLE_LIMIT_MS, `the rows settled ${settleMs} ms after the last run end`);
    assert.ok(
      before.some((word) => word !== CACHED_WORD),
      'every task read cached before the burst'
    );
  });
};

/**
 * P6b: the same five tasks again, started `BURST_STAGGER_MS` apart so run ends land one batch window and a dry run apart,
 * where each end finds the previous dry run live. The settle is the first dry run that closes without a signal after the
 * last end; the rows already read cached, so only that close tells.
 */
export const staggeredBurstCase = async (scene: PredictionScene): Promise<void> => {
  const { api, counter } = scene;

  await step('P6b: five run ends one window apart still settle after the last end', async () => {
    const taskIds = burstIdsOf(scene);
    const nodes = await nodesOf(scene, taskIds);

    counter.reset();

    const burst = await runStaggered(scene, nodes, BURST_STAGGER_MS);
    const isSettledAfterEnd = (): boolean => counter.dryRunCloses().some((close) => !close.aborted && close.at > burst.lastEnd);

    await waitFor('a dry run closes after the last run end', isSettledAfterEnd, SETTLE_LIMIT_MS);

    const settled = counter.dryRunCloses().find((close) => !close.aborted && close.at > burst.lastEnd);
    const settleMs = Math.round((settled?.at ?? Number.NaN) - burst.lastEnd);

    await delay(QUIET_WINDOW_MS);

    const spawned = predictionRunsOf(scene).length;
    const aborted = counter.dryRunCloses().filter((close) => close.aborted).length;

    log(
      `P6b: ${spawned} dry-run spawns, ${aborted} aborted; last end to a settled dry run ${settleMs} ms; gaps between run ends [${gapsOf(burst.ends)}] ms`
    );

    for (const id of taskIds) assert.equal(await taskWordOf(api, id), CACHED_WORD, id);
  });
};
