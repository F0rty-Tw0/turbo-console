import assert from 'node:assert/strict';

import type { GraphReady, GraphTask } from '@turbo-console/webview-ui';
import * as vscode from 'vscode';

import { lastGraphState } from './graph-posted.spec.util.ts';
import { filtersOf, predictionRunsOf } from './prediction-scene.spec.util.ts';
import { closeGraph } from './prediction-spawn-cases.spec.util.ts';
import { log, sleep, step, waitFor } from './suite-env.spec.util.ts';
import { ALL_TASKS_COMMAND, GRAPH_COMMAND } from '../common/graph.const.ts';
import { HIDE_PREDICTION_COMMAND, QUIET_WINDOW_MS, SHOW_PREDICTION_COMMAND } from '../common/prediction.const.ts';
import type { PredictionScene } from '../common/prediction.type.ts';

const isTurboTask = (task: GraphTask): boolean => task.isTurboTask;

const packageOf = (task: GraphTask): string => task.packageName;

/** The sorted package names of the tasks task mode pools after Show All Task Graphs: the turbo tasks of the state. */
const pooledPackagesOf = (state: GraphReady): string[] => {
  const pooled = state.tasks.filter(isTurboTask);
  const names = new Set(pooled.map(packageOf));

  const unique = [...names];

  return unique.toSorted();
};

const filtersOfAll = (runs: string[][]): string[] => runs.flatMap(filtersOf);

/**
 * P7: the real graph page drives the prediction. The toggle goes off and on, which clears the store, and the packages the
 * tree asks for after that are the known ones. The graph then opens in packages mode, where its page posts nothing (no
 * dry run); Show All Task Graphs puts it in task mode, the page posts `shownTaskPackages` by itself, and one dry run
 * follows for the pooled packages no earlier case in this window left with a prediction.
 */
export const graphPageCase = async (scene: PredictionScene): Promise<void> => {
  const { api, counter, root } = scene;

  await step('P7: the real graph page posts its task packages, one dry run for those not yet known', async () => {
    counter.reset();
    await vscode.commands.executeCommand(HIDE_PREDICTION_COMMAND);
    await vscode.commands.executeCommand(SHOW_PREDICTION_COMMAND);
    await sleep(QUIET_WINDOW_MS);

    const known = filtersOfAll(predictionRunsOf(scene));

    counter.reset();

    try {
      await vscode.commands.executeCommand(GRAPH_COMMAND);
      await waitFor('graph state', () => lastGraphState(api, root) !== null);
      await sleep(QUIET_WINDOW_MS);

      const inPackagesMode = predictionRunsOf(scene);

      await vscode.commands.executeCommand(ALL_TASKS_COMMAND);
      await waitFor('the page posted its packages', () => predictionRunsOf(scene).length > 0);
      await sleep(QUIET_WINDOW_MS);

      const state = lastGraphState(api, root);
      const spawned = predictionRunsOf(scene);
      const filters = filtersOfAll(spawned);

      if (state === null) throw new Error('the graph panel posted no state');

      const isUnknown = (name: string): boolean => !known.includes(name);
      const expected = pooledPackagesOf(state).filter(isUnknown);

      log(`P7: ${expected.length} packages pooled and not known; ${filters.length} filters in ${spawned.length} dry run`);
      assert.equal(state.predictionShown, true, 'the page was told the toggle is off');
      assert.equal(inPackagesMode.length, 0, `dry runs in packages mode: ${JSON.stringify(inPackagesMode)}`);
      assert.equal(spawned.length, 1, `dry runs in task mode: ${JSON.stringify(spawned)}`);
      assert.ok(expected.length > 0, 'every pooled package was known, so the page had nothing to post');
      assert.deepEqual(new Set(filters), new Set(expected));
    } finally {
      await closeGraph(scene);
    }
  });
};
