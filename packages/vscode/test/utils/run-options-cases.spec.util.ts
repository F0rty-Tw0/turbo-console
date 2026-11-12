import assert from 'node:assert/strict';

import { runWithPicks } from './run-options-drive.spec.util.ts';
import { endedRun, startRun, taskNodeNamed } from './run-wait.spec.util.ts';
import { step } from './suite-env.spec.util.ts';
import { watchStartedArgs } from './tree-polish-cache.spec.util.ts';
import type { RunEntry } from '../../src/run/common/run.type.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import { OPTIONS_BUILD_ID, OPTIONS_PACKAGE } from '../common/run-options.const.ts';

type StartedRun = { readonly args: string[]; readonly starts: number; readonly ended: RunEntry };

/** Starts a run through `start` (returns the launch token), waits for its end; returns the process args VS Code started it with. */
const argsOfRun = async (api: TurboConsoleApi, node: TreeNode, start: () => Promise<number>): Promise<StartedRun> => {
  const started = watchStartedArgs(OPTIONS_BUILD_ID);

  try {
    const launchedAt = await start();
    const ended = await endedRun(api, node, launchedAt);
    const run: StartedRun = { args: started.args(), starts: started.starts(), ended };

    return run;
  } finally {
    started.dispose();
  }
};

/** I3: an empty pick starts the same process and records the same entry as the plain Run. */
export const emptyPickCase = async (api: TurboConsoleApi): Promise<void> => {
  await step('L19-3: an empty pick runs the same argv and entry as Run (I3)', async () => {
    const node = await taskNodeNamed(api, OPTIONS_PACKAGE, OPTIONS_BUILD_ID);
    const plain = await argsOfRun(api, node, async () => startRun(api, node));
    const empty = await argsOfRun(api, node, async () => runWithPicks(api, node, []));

    assert.deepEqual(empty.args, plain.args);
    assert.ok(empty.args.includes('--summarize'), `args: ${empty.args.join(' ')}`);
    assert.equal(plain.starts, 1);
    assert.equal(empty.starts, 1);
    assert.equal(empty.ended.state, 'passed');
    assert.equal(empty.ended.force, false);
    assert.equal('extras' in empty.ended, false);
  });
};
