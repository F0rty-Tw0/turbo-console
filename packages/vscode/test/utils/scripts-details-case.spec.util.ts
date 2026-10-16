import assert from 'node:assert/strict';

import * as vscode from 'vscode';

import { openFromRow } from './details-cases.spec.util.ts';
import { lastPackageState, packageStates } from './details-posted.spec.util.ts';
import { endedRun } from './run-wait.spec.util.ts';
import { scriptNodeNamed } from './scripts-tree.spec.util.ts';
import { step, waitFor } from './suite-env.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import { ADDED_TASK_IDS, OK_RUN_COMMAND, OK_TASK_ID, SCRIPTS_PACKAGE } from '../common/scripts.const.ts';

/**
 * Case 7: with scripts shown, Package Details holds a script card for each added script, `zz-ok` with its run command, and
 * a `run` message for it is accepted and ends `passed`. Scripts are hidden again at the end.
 */
export const detailsCase = async (api: TurboConsoleApi, root: string): Promise<void> => {
  await step('L10-7: Package Details shows the script cards and a run message for zz-ok ends passed', async () => {
    await vscode.commands.executeCommand('turboConsole.showScripts');

    try {
      await openFromRow(root, SCRIPTS_PACKAGE);
      await waitFor('page ready', () => packageStates(api, root, SCRIPTS_PACKAGE).length > 0);
      await api.details.whenIdle(root, SCRIPTS_PACKAGE);

      const state = lastPackageState(api, root, SCRIPTS_PACKAGE);
      const scripts = state.tasks.filter((card) => !card.isTurboTask);
      const ids = scripts.map((card) => card.taskId).sort();
      const ok = scripts.find((card) => card.taskId === OK_TASK_ID);

      assert.deepEqual(ids, ADDED_TASK_IDS);
      assert.equal(ok?.runCommand, OK_RUN_COMMAND);

      await api.details.receive(root, SCRIPTS_PACKAGE, { type: 'run', taskId: OK_TASK_ID });

      const node = await scriptNodeNamed(api, SCRIPTS_PACKAGE, OK_TASK_ID);
      const started = api.runs.get(root, OK_TASK_ID);

      if (started === undefined) throw new Error(`the panel started no run of ${OK_TASK_ID}`);

      const ended = await endedRun(api, node, started.launchedAt);

      assert.equal(ended.state, 'passed');
    } finally {
      await vscode.commands.executeCommand('turboConsole.hideScripts');
    }
  });
};
