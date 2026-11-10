import assert from 'node:assert/strict';

import * as vscode from 'vscode';

import { lastGraphState } from './graph-posted.spec.util.ts';
import { expandAndSettle, expandTogether, filtersOf, predictionRunsOf } from './prediction-scene.spec.util.ts';
import { sleep, step, waitFor } from './suite-env.spec.util.ts';
import { ALL_TASKS_COMMAND, CLOSE_EDITOR_COMMAND, GRAPH_COMMAND } from '../common/graph.const.ts';
import { HIDE_PREDICTION_COMMAND, QUIET_WINDOW_MS, SHOW_PREDICTION_COMMAND } from '../common/prediction.const.ts';
import type { PredictionScene } from '../common/prediction.type.ts';

/** Opens the graph, switches it to task mode and has the page report the shown packages, as it does when the toggle is on. */
const showTasksInGraph = async (scene: PredictionScene): Promise<void> => {
  const { api, root, packages } = scene;
  const { a, b, c } = packages;

  await vscode.commands.executeCommand(GRAPH_COMMAND);
  await waitFor('graph state', () => lastGraphState(api, root) !== null);
  await vscode.commands.executeCommand(ALL_TASKS_COMMAND);
  await api.graph.receive(root, { type: 'shownTaskPackages', packageNames: [a, b, c] });
};

const closeGraph = async (scene: PredictionScene): Promise<void> => {
  await vscode.commands.executeCommand(CLOSE_EDITOR_COMMAND);
  await waitFor('panel closed', () => scene.api.graph.panels().length === 0);
};

/** P1: the toggle defaults off, so a tree expand and a graph in task mode ask turbo for no dry run, even when the page reports shown packages. */
export const toggleOffCase = async (scene: PredictionScene): Promise<void> => {
  const { counter, packages } = scene;

  await step('P1: toggle off, tree expand and graph task mode spawn no dry run', async () => {
    counter.reset();
    await expandTogether(scene, [packages.a, packages.b, packages.c]);
    await showTasksInGraph(scene);
    await sleep(QUIET_WINDOW_MS);

    const spawned = predictionRunsOf(scene);

    await closeGraph(scene);
    assert.equal(spawned.length, 0, `dry runs: ${JSON.stringify(spawned)}`);
  });
};

/** P2: toggle on and one package expanded make one dry run, and it filters on that package alone. */
export const oneDryRunCase = async (scene: PredictionScene): Promise<void> => {
  const { api, counter, packages } = scene;

  await step('P2: toggle on, expand one package, one dry run with that filter', async () => {
    await vscode.commands.executeCommand(SHOW_PREDICTION_COMMAND);
    counter.reset();
    await expandAndSettle(api, packages.a);
    await sleep(QUIET_WINDOW_MS);

    const spawned = predictionRunsOf(scene);

    assert.equal(spawned.length, 1, `dry runs: ${JSON.stringify(spawned)}`);
    assert.deepEqual(filtersOf(spawned[0] ?? []), [packages.a]);
  });
};

/** P3: three packages expanded back to back share one dry run, which filters on all three. */
export const batchedCase = async (scene: PredictionScene): Promise<void> => {
  const { api, counter, packages } = scene;
  const names = [packages.a, packages.b, packages.c];

  await step('P3: three packages expanded within one window, one dry run with three filters', async () => {
    await vscode.commands.executeCommand(HIDE_PREDICTION_COMMAND);
    await vscode.commands.executeCommand(SHOW_PREDICTION_COMMAND);
    counter.reset();
    await expandTogether(scene, names);

    for (const name of names) await expandAndSettle(api, name);

    await sleep(QUIET_WINDOW_MS);

    const spawned = predictionRunsOf(scene);

    assert.equal(spawned.length, 1, `dry runs: ${JSON.stringify(spawned)}`);
    assert.deepEqual(new Set(filtersOf(spawned[0] ?? [])), new Set(names));
  });
};
