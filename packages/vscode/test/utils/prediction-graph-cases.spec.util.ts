import assert from 'node:assert/strict';

import type { GraphReady, GraphRunsMessage, GraphTask } from '@turbo-console/webview-ui';
import * as vscode from 'vscode';

import { lastGraphState, lastPostedRuns, postedRunsAfter } from './graph-posted.spec.util.ts';
import { filtersOf, packageOfTask, predictionRunsOf } from './prediction-scene.spec.util.ts';
import { closeGraph } from './prediction-spawn-cases.spec.util.ts';
import { log, sleep, step, waitFor } from './suite-env.spec.util.ts';
import { PREDICTION_WORDS_BY_CACHE } from '../../src/graph/common/graph-prediction.const.ts';
import { ALL_TASKS_COMMAND, GRAPH_COMMAND } from '../common/graph.const.ts';
import { HIDE_PREDICTION_COMMAND, QUIET_WINDOW_MS, SHOW_PREDICTION_COMMAND } from '../common/prediction.const.ts';
import type { PredictionScene } from '../common/prediction.type.ts';

const GRAPH_WORDS: ReadonlySet<string> = new Set(Object.values(PREDICTION_WORDS_BY_CACHE));

const isTurboTask = (task: GraphTask): boolean => task.isTurboTask;

const predictionsOf = (message: GraphRunsMessage): Readonly<Record<string, string>> => message.predictions ?? {};

const idsOf = (message: GraphRunsMessage): string[] => Object.keys(predictionsOf(message));

const wordsOf = (message: GraphRunsMessage): string[] => Object.values(predictionsOf(message));

/** The task ids of `runs` messages posted after `mark` whose `predictions` name a task of one of `packageNames`. */
const predictedIdsAfter = (scene: PredictionScene, mark: GraphRunsMessage | undefined, packageNames: string[]): string[] => {
  const posted = postedRunsAfter(scene.api, scene.root, mark);
  const ids = posted.flatMap(idsOf);
  const isOfPackage = (id: string): boolean => packageNames.includes(packageOfTask(id));

  return ids.filter(isOfPackage);
};

/**
 * The real host carries the settled dry run to the real page: a `runs` message after `mark` has `predictions` for a task
 * of the packages the page asked for, and every word on the wire is one the page reads.
 */
const assertPredictionsPosted = async (
  scene: PredictionScene,
  mark: GraphRunsMessage | undefined,
  packageNames: string[]
): Promise<void> => {
  const hasPredicted = (): boolean => predictedIdsAfter(scene, mark, packageNames).length > 0;

  await waitFor('a runs message carries predictions for the shown packages', hasPredicted);

  const posted = postedRunsAfter(scene.api, scene.root, mark);
  const words = posted.flatMap(wordsOf);
  const isGraphWord = (word: string): boolean => GRAPH_WORDS.has(word);

  assert.ok(words.every(isGraphWord), `words on the wire: ${words.join(', ')}`);
};

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
      const mark = lastPostedRuns(api, root);

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
      await assertPredictionsPosted(scene, mark, expected);
    } finally {
      await closeGraph(scene);
    }
  });
};
