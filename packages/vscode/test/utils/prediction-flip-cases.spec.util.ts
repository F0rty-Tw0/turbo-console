import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import * as vscode from 'vscode';

import { independentIdsOf } from './prediction-burst-cases.spec.util.ts';
import { cachedIdsOf, taintedIdsOf } from './prediction-edit.spec.util.ts';
import { buildIdOf, filtersOf, packageOfTask, predictionRunsOf, taskWordOf, waitForWord } from './prediction-scene.spec.util.ts';
import { endedRun, startRun, taskNodeNamed } from './run-wait.spec.util.ts';
import { log, sleep, step } from './suite-env.spec.util.ts';
import type { RunEntry } from '../../src/run/common/run.type.ts';
import { CACHED_WORD, EDITED_FILE, EDIT_LINE, NOT_CACHED_WORD, QUIET_WINDOW_MS, REFRESH_COMMAND } from '../common/prediction.const.ts';
import type { PredictionScene } from '../common/prediction.type.ts';

const idsOf = (entry: RunEntry): string[] => {
  const outcomes = entry.outcomes ?? [];

  return outcomes.map((outcome) => outcome.taskId);
};

/** Runs `taskId` through the Run command and returns the ended run. */
const runTaskId = async (scene: PredictionScene, taskId: string): Promise<RunEntry> => {
  const { api } = scene;
  const node = await taskNodeNamed(api, packageOfTask(taskId), taskId);
  const launchedAt = await startRun(api, node);

  return endedRun(api, node, launchedAt);
};

/**
 * P4: a run ends and the dry run it queues reads every task that ran as cached. The ran tasks are the run's own outcome
 * list, not the prediction; the package `a` run also runs the `build` of `b`. A row keeps its old word until the new dry
 * run settles, so the wait is for the word itself.
 */
export const runEndCase = async (scene: PredictionScene): Promise<void> => {
  const { api, counter, packages } = scene;
  const shown = [packages.a, packages.b, packages.c];

  await step('P4: after a run ends, every task that ran reads cached', async () => {
    const before = await taskWordOf(api, buildIdOf(packages.a));

    counter.reset();

    const ended = await runTaskId(scene, buildIdOf(packages.a));
    const ranTasks = idsOf(ended);
    const isShown = (id: string): boolean => shown.includes(packageOfTask(id));

    log(`P4: ran ${ranTasks.join(', ')}; ${buildIdOf(packages.a)} read "${before}" before`);
    assert.notEqual(before, CACHED_WORD, 'the build of a read cached before it ever ran');
    assert.ok(ranTasks.includes(buildIdOf(packages.a)));
    assert.ok(ranTasks.includes(buildIdOf(packages.b)));
    assert.ok(ranTasks.every(isShown), `a task ran outside the shown packages: ${ranTasks.join(', ')}`);

    for (const task of ranTasks) await waitForWord(api, task, CACHED_WORD);

    await sleep(QUIET_WINDOW_MS);

    const spawned = predictionRunsOf(scene);

    assert.equal(spawned.length, 1, `one dry run after the run end: ${JSON.stringify(spawned)}`);
    assert.deepEqual(new Set(filtersOf(spawned[0] ?? [])), new Set(shown));
  });
};

const pathOf = (scene: PredictionScene, packageName: string): string => {
  const pkg = scene.manifest.packages.find((candidate) => candidate.name === packageName);

  if (pkg === undefined) throw new Error(`the manifest has no package ${packageName}`);

  return join(scene.root, pkg.path, EDITED_FILE);
};

const isNotCached = (word: string): boolean => word !== CACHED_WORD;

/** The ids among `ids` whose rows read something other than cached now. */
const notCachedAmong = async (api: PredictionScene['api'], ids: string[]): Promise<string[]> => {
  const notCached: string[] = [];

  for (const id of ids) {
    const word = await taskWordOf(api, id);

    const isChanged = isNotCached(word);

    if (isChanged) notCached.push(id);
  }

  return notCached;
};

/**
 * P5: a run of `c` leaves its `build` cached; one input of `b` changes and Refresh asks again, so `b#build` and `a#build`,
 * which depends on it, read not cached. Every other shown row that read cached before still does, unless it belongs to `b`
 * or depends on a task of `b`. Refresh queues the shown packages once, and the model reload it causes must not add a
 * second dry run, so the dry runs counted from the Refresh command on are exactly one. The edit is undone in `finally`.
 */
export const editCase = async (scene: PredictionScene): Promise<void> => {
  const { api, counter, packages, manifest } = scene;
  const file = pathOf(scene, packages.b);
  const [a, b, c] = [buildIdOf(packages.a), buildIdOf(packages.b), buildIdOf(packages.c)];

  await step('P5: edit one input and Refresh, that task and its dependents read not cached', async () => {
    const original = await readFile(file, 'utf8');

    try {
      const isOtherTask = (id: string): boolean => id !== c;
      const other = independentIdsOf(scene, packages.c).find(isOtherTask);

      if (other === undefined) throw new Error(`${packages.c} has no independent task besides ${c}`);

      await runTaskId(scene, c);
      await runTaskId(scene, other);

      for (const task of [a, b, c, other]) await waitForWord(api, task, CACHED_WORD);

      const cachedBefore = await cachedIdsOf(scene, [packages.a, packages.b, packages.c]);

      await writeFile(file, `${original}${EDIT_LINE}`);
      counter.reset();
      await vscode.commands.executeCommand(REFRESH_COMMAND);
      await waitForWord(api, b, NOT_CACHED_WORD);
      await waitForWord(api, a, NOT_CACHED_WORD);
      await sleep(QUIET_WINDOW_MS);

      const spawned = predictionRunsOf(scene);
      const flipped = await notCachedAmong(api, cachedBefore);
      const tainted = taintedIdsOf(manifest, packages.b);
      const isUntouched = (id: string): boolean => !tainted.has(id);
      const untouched = cachedBefore.filter(isUntouched);
      const changed = await notCachedAmong(api, untouched);

      log(
        `P5: ${spawned.length} dry runs after Refresh; read cached before [${cachedBefore.join(', ')}]; flipped [${flipped.join(', ')}]`
      );
      assert.equal(spawned.length, 1, `dry runs after Refresh: ${JSON.stringify(spawned)}`);
      assert.ok(untouched.includes(c), `${c} is not among the untouched cached rows: ${untouched.join(', ')}`);
      assert.ok(untouched.includes(other), `${other} is not among the untouched cached rows: ${untouched.join(', ')}`);
      assert.deepEqual(changed, [], 'a cached row outside the edited package and its dependents changed');
      assert.ok(flipped.includes(a), `${a} did not flip: ${flipped.join(', ')}`);
      assert.ok(flipped.includes(b), `${b} did not flip: ${flipped.join(', ')}`);
    } finally {
      await writeFile(file, original);
    }
  });
};
