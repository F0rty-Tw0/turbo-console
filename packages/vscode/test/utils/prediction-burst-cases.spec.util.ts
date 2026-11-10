import assert from 'node:assert/strict';

import {
  isPlainPackage,
  packageOfTask,
  predictionClosesOf,
  predictionRunsOf,
  taskWordOf,
  waitForWord
} from './prediction-scene.spec.util.ts';
import { endedRun, startRun, taskNodeNamed } from './run-wait.spec.util.ts';
import { budget, log, sleep, step } from './suite-env.spec.util.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import type { DryRunClose, ShownPackage, ShownTask } from '../common/launch.type.ts';
import { BURST_RUNS, BURST_STAGGER_MS, CACHED_WORD, QUIET_WINDOW_MS, SETTLE_LIMIT_MS } from '../common/prediction.const.ts';
import type { Burst, PredictionScene } from '../common/prediction.type.ts';

const isIndependent = (task: ShownTask): boolean => {
  const isShownTask = task.visible && task.kind === 'task';
  const dependsOnNothing = task.dependencies.length === 0;

  return isShownTask && dependsOnNothing;
};

const independentIdsOf = (scene: PredictionScene, packageName: string): string[] => {
  const isOwn = (task: ShownTask): boolean => task.packageName === packageName && isIndependent(task);
  const own = scene.manifest.tasks.filter(isOwn);

  return own.map((task) => task.fullName).toSorted();
};

const nameOf = (pkg: ShownPackage): string => pkg.name;

/** The independent tasks of `c`, then `b`, then every other plain package by name: tasks that need no other run. */
const burstPoolOf = (scene: PredictionScene): string[] => {
  const { b, c } = scene.packages;
  const plainNames = scene.manifest.packages.filter(isPlainPackage).map(nameOf);
  const isOther = (name: string): boolean => name !== b && name !== c;
  const others = plainNames.filter(isOther).toSorted();
  const owners = [c, b, ...others];

  const idsOfOwner = (owner: string): string[] => independentIdsOf(scene, owner);

  return owners.flatMap(idsOfOwner);
};

/** The `index`-th set of `BURST_RUNS` tasks of the pool; sets are disjoint, so a task runs in one burst only. */
const burstIdsOf = (scene: PredictionScene, index: number): string[] => {
  const pool = burstPoolOf(scene);
  const from = index * BURST_RUNS;
  const ids = pool.slice(from, from + BURST_RUNS);

  if (ids.length < BURST_RUNS) throw new Error(`burst ${index} needs ${BURST_RUNS} independent tasks, the manifest has ${ids.length}`);

  return ids;
};

const byTime = (left: number, right: number): number => left - right;

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
    await sleep(staggerMs);
  }

  await Promise.all(finishing);

  const sortedEnds = ends.toSorted(byTime);
  const lastEnd = sortedEnds.at(-1) ?? Number.NaN;
  const burst: Burst = { ends: sortedEnds, lastEnd };

  return burst;
};

const gapsOf = (ends: number[]): string => {
  const later = ends.slice(1);
  const gapAt = (end: number, index: number): string => {
    const previous = ends[index] ?? end;
    const gap = Math.round(end - previous);

    return `${gap}`;
  };

  return later.map(gapAt).join(', ');
};

const wordsOf = async (scene: PredictionScene, taskIds: string[]): Promise<string[]> => {
  const words: string[] = [];

  for (const id of taskIds) words.push(await taskWordOf(scene.api, id));

  return words;
};

const nodesOf = async (scene: PredictionScene, taskIds: string[]): Promise<TreeNode[]> => {
  const nodeOf = async (id: string): Promise<TreeNode> => taskNodeNamed(scene.api, packageOfTask(id), id);

  return Promise.all(taskIds.map(nodeOf));
};

const isNotCached = (word: string): boolean => word !== CACHED_WORD;

const isAborted = (close: DryRunClose): boolean => close.aborted;

/** How many prediction dry runs a signal ended; POSIX-only (see `DryRunClose`), so it is logged and never asserted. */
const abortedCountOf = (scene: PredictionScene): number => predictionClosesOf(scene).filter(isAborted).length;

/** Fails before the burst when every task already reads cached, because then a flip proves nothing. */
const assertSomeNotCached = (before: string[], taskIds: string[]): void => {
  assert.ok(before.some(isNotCached), `every task read cached before the burst: ${taskIds.join(', ')}`);
};

/**
 * P6: five short runs that end close together must still end with every task that ran reading cached soon after the last
 * end. Each run end re-queues the shown packages, which may abort a dry run that is under way; whether one does depends on
 * the timing, and real runs mostly abort none, so the aborted count is logged and never asserted. Rows keep their old
 * word until a dry run settles, so the settle is the word flipping; some of these tasks never ran before.
 */
export const burstCase = async (scene: PredictionScene): Promise<void> => {
  const { api, counter, env } = scene;

  await step('P6: five run ends close together still settle the shown rows', async () => {
    const taskIds = burstIdsOf(scene, 0);
    const nodes = await nodesOf(scene, taskIds);
    const before = await wordsOf(scene, taskIds);

    assertSomeNotCached(before, taskIds);
    counter.reset();

    const burst = await runStaggered(scene, nodes, 0);

    for (const id of taskIds) await waitForWord(api, id, CACHED_WORD);

    const settleMs = Math.round(performance.now() - burst.lastEnd);

    await sleep(QUIET_WINDOW_MS);

    const spawned = predictionRunsOf(scene).length;
    const aborted = abortedCountOf(scene);

    log(
      `P6: words before [${before.join(', ')}]; ${spawned} dry-run spawns, ${aborted} aborted; last end to every row cached ${settleMs} ms; gaps between run ends [${gapsOf(burst.ends)}] ms`
    );
    budget('P6 settle', settleMs, SETTLE_LIMIT_MS, env);
  });
};

/**
 * P6b: five other tasks, which no earlier case ran, started `BURST_STAGGER_MS` apart so run ends land about one batch
 * window apart. As in P6, the proof is the rows flipping to cached after the runs ended, which holds on any OS; the
 * aborted count is a log line only, because Windows ends an abort with `taskkill`, which leaves no signal on the close.
 */
export const staggeredBurstCase = async (scene: PredictionScene): Promise<void> => {
  const { api, counter } = scene;

  await step('P6b: five run ends one window apart still settle the shown rows', async () => {
    const taskIds = burstIdsOf(scene, 1);
    const nodes = await nodesOf(scene, taskIds);
    const before = await wordsOf(scene, taskIds);

    assertSomeNotCached(before, taskIds);
    counter.reset();

    const burst = await runStaggered(scene, nodes, BURST_STAGGER_MS);

    for (const id of taskIds) await waitForWord(api, id, CACHED_WORD);

    const settleMs = Math.round(performance.now() - burst.lastEnd);

    await sleep(QUIET_WINDOW_MS);

    const spawned = predictionRunsOf(scene).length;
    const aborted = abortedCountOf(scene);

    log(
      `P6b: words before [${before.join(', ')}]; ${spawned} dry-run spawns, ${aborted} aborted; last end to every row cached ${settleMs} ms; gaps between run ends [${gapsOf(burst.ends)}] ms`
    );
  });
};
