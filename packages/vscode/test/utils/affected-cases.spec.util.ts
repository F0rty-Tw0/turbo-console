import assert from 'node:assert/strict';
import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';

import * as vscode from 'vscode';

import { allEditsOf } from './affected-edit-set.spec.util.ts';
import { expectedAffected } from './affected-oracle.spec.util.ts';
import { expandEdited, flipTreeMode } from './affected-redraw.spec.util.ts';
import { queriesOf, settleRows, taskWordsOf, waitForDescription } from './affected-scene.spec.util.ts';
import { lastGraphState } from './graph-posted.spec.util.ts';
import { closeGraph } from './prediction-spawn-cases.spec.util.ts';
import { sleep, step, waitFor } from './suite-env.spec.util.ts';
import { LABEL_TASK, SHOW_AFFECTED_COMMAND, SOURCE_FILE, UNCOMMITTED_LINE, WORD_CHANGED } from '../common/affected.const.ts';
import type { AffectedScene } from '../common/affected.type.ts';
import { ALL_TASKS_COMMAND, GRAPH_COMMAND } from '../common/graph.const.ts';
import { QUIET_WINDOW_MS, REFRESH_COMMAND } from '../common/prediction.const.ts';

/**
 * A1: the toggle defaults off, so the reveal, a tree expand and a graph in task mode spawn no affected query, and the view
 * has no description. The counter is not reset: it has counted since before the reveal, which is the first tree load.
 */
export const affectedOffCase = async (scene: AffectedScene): Promise<void> => {
  const { api, root } = scene;

  await step('A1: toggle off, tree expand and graph task mode spawn no affected query', async () => {
    await expandEdited(scene);
    await vscode.commands.executeCommand(GRAPH_COMMAND);
    await waitFor('graph state', () => lastGraphState(api, root) !== null);
    await vscode.commands.executeCommand(ALL_TASKS_COMMAND);
    await sleep(QUIET_WINDOW_MS);

    const queries = queriesOf(scene);

    await closeGraph(scene);
    assert.equal(queries.length, 0, JSON.stringify(queries));
    assert.equal(api.treeDescription(), '');
  });
};

/** A2: toggle on makes one query; expands, a redraw and a re-show of the view make no more. */
export const affectedOnceCase = async (scene: AffectedScene): Promise<void> => {
  const { api, counter } = scene;

  await step('A2: toggle on, one query; expands, a redraw and a re-show spawn no more', async () => {
    counter.reset();
    await vscode.commands.executeCommand(SHOW_AFFECTED_COMMAND);
    await waitForDescription(api, LABEL_TASK);
    await expandEdited(scene);
    await expandEdited(scene);
    await flipTreeMode();
    await sleep(QUIET_WINDOW_MS);

    const queries = queriesOf(scene);

    assert.equal(queries.length, 1, JSON.stringify(queries));
  });
};

/** A5: a new edit then Refresh makes exactly one new query, and the rows follow. */
export const affectedRefreshCase = async (scene: AffectedScene): Promise<void> => {
  const { counter, manifest, root, edits } = scene;

  await step('A5: a new edit then Refresh: exactly one new query, and the rows follow', async () => {
    const file = join(root, edits.atomDependency.path, SOURCE_FILE);

    await appendFile(file, UNCOMMITTED_LINE);
    counter.reset();
    await vscode.commands.executeCommand(REFRESH_COMMAND);

    const expected = expectedAffected(manifest, allEditsOf(scene), 'task');

    await settleRows(scene, expected);
    await sleep(QUIET_WINDOW_MS);

    const queries = queriesOf(scene);
    const words = await taskWordsOf(scene);

    assert.equal(queries.length, 1, JSON.stringify(queries));
    assert.equal(words.get(`${edits.atomDependency.name}#build`), WORD_CHANGED);
  });
};
