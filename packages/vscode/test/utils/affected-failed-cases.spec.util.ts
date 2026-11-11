import assert from 'node:assert/strict';

import * as vscode from 'vscode';

import { expandEdited, flipTreeMode } from './affected-redraw.spec.util.ts';
import { markedReadsOf, queriesOf, waitForDescription } from './affected-scene.spec.util.ts';
import { sleep, step } from './suite-env.spec.util.ts';
import { LABEL_UNAVAILABLE, SHOW_AFFECTED_COMMAND } from '../common/affected.const.ts';
import type { AffectedScene } from '../common/affected.type.ts';
import { QUIET_WINDOW_MS } from '../common/prediction.const.ts';

/** A6: a root that is not a git repo reads unavailable, shows no mark and does not respawn on a redraw. */
export const affectedFailedCase = async (scene: AffectedScene): Promise<void> => {
  const { api, counter } = scene;

  await step('A6: a root that is not a git repo reads unavailable, shows no mark and does not respawn', async () => {
    counter.reset();
    await vscode.commands.executeCommand(SHOW_AFFECTED_COMMAND);
    await waitForDescription(api, LABEL_UNAVAILABLE);
    await expandEdited(scene);
    await flipTreeMode();
    await flipTreeMode();
    await sleep(QUIET_WINDOW_MS);

    const queries = queriesOf(scene);
    const marked = await markedReadsOf(scene);

    assert.equal(queries.length, 1, `Failed ignores rootShown: no respawn on redraw; ${JSON.stringify(queries)}`);
    assert.deepEqual(marked, []);
    assert.equal(api.treeDescription(), LABEL_UNAVAILABLE);
  });
};
