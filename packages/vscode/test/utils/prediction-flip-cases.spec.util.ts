import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import * as vscode from 'vscode';

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

/**
 * P5: a run of `c` leaves its `build` cached; one input of `b` changes and Refresh asks again, so `b#build` and `a#build`,
 * which depends on it, read not cached while `c#build` stays cached. The edit is undone in `finally`.
 */
export const editCase = async (scene: PredictionScene): Promise<void> => {
  const { api, packages } = scene;
  const file = pathOf(scene, packages.b);
  const [a, b, c] = [buildIdOf(packages.a), buildIdOf(packages.b), buildIdOf(packages.c)];

  await step('P5: edit one input and Refresh, that task and its dependents read not cached', async () => {
    const original = await readFile(file, 'utf8');

    try {
      await runTaskId(scene, c);

      for (const task of [a, b, c]) await waitForWord(api, task, CACHED_WORD);

      await writeFile(file, `${original}${EDIT_LINE}`);
      await vscode.commands.executeCommand(REFRESH_COMMAND);
      await waitForWord(api, b, NOT_CACHED_WORD);
      await waitForWord(api, a, NOT_CACHED_WORD);
      await sleep(QUIET_WINDOW_MS);

      assert.equal(await taskWordOf(api, c), CACHED_WORD, 'the untouched package changed');
      assert.equal(await taskWordOf(api, b), NOT_CACHED_WORD);
      assert.equal(await taskWordOf(api, a), NOT_CACHED_WORD);
    } finally {
      await writeFile(file, original);
    }
  });
};
