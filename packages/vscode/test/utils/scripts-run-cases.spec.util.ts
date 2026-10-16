import assert from 'node:assert/strict';
import { relative } from 'node:path';

import { packageDirOf } from './package-edit.spec.util.ts';
import { endedRun, startRun } from './run-wait.spec.util.ts';
import { logPnpmVersion, watchShell } from './scripts-shell.spec.util.ts';
import { scriptNodeNamed } from './scripts-tree.spec.util.ts';
import { log, step } from './suite-env.spec.util.ts';
import { logExit } from './tree-polish-run.spec.util.ts';
import { descriptionOf } from './tree-polish-tree.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { SpawnCounter } from '../common/launch.type.ts';
import { FAIL_EXIT_CODE, FAIL_TASK_ID, OK_SCRIPT, OK_TASK_ID, SCRIPTS_PACKAGE } from '../common/scripts.const.ts';

/**
 * Case 3: a script that exits 0 ends `passed`; VS Code was asked for `pnpm run zz-ok` as a shell execution in the package
 * dir (V4), the task shell finds pnpm (V3), and the host spawned no turbo.
 */
export const passedCase = async (api: TurboConsoleApi, root: string, counter: SpawnCounter): Promise<void> => {
  await step('L10-3: a script that exits 0 ends passed as pnpm run in its package dir, with no host turbo spawn', async () => {
    const node = await scriptNodeNamed(api, SCRIPTS_PACKAGE, OK_TASK_ID);
    const dir = await packageDirOf(root, SCRIPTS_PACKAGE);
    const watch = watchShell(OK_TASK_ID);

    await logPnpmVersion(root);
    counter.reset();

    try {
      const launchedAt = await startRun(api, node);
      const ended = await endedRun(api, node, launchedAt);
      const facts = watch.facts();

      logExit('script passed', ended);
      log(`V4: ShellExecution ${JSON.stringify(facts)} on ${process.platform}`);
      assert.equal(ended.state, 'passed');
      assert.ok(facts !== null, 'no shell execution seen for the run');
      assert.equal(facts.command, 'pnpm');
      assert.deepEqual(facts.args, ['run', OK_SCRIPT]);
      assert.equal(relative(dir, facts.cwd ?? ''), '');
      assert.equal(counter.count(), 0, 'host turbo spawns');
    } finally {
      watch.dispose();
    }
  });
};

/** Case 4: a script that exits 3 ends `failed`, and its row reads `exit 3`. */
export const failedCase = async (api: TurboConsoleApi): Promise<void> => {
  await step('L10-4: a script that exits 3 ends failed and its row reads exit 3', async () => {
    const node = await scriptNodeNamed(api, SCRIPTS_PACKAGE, FAIL_TASK_ID);
    const launchedAt = await startRun(api, node);
    const ended = await endedRun(api, node, launchedAt);

    logExit('script failed', ended);
    assert.equal(ended.state, 'failed');
    assert.equal(ended.exitCode, FAIL_EXIT_CODE);
    assert.equal(descriptionOf(api, node), `exit ${FAIL_EXIT_CODE}`);
  });
};
