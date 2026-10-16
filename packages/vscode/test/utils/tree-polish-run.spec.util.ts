import assert from 'node:assert/strict';

import { endedRun, taskNodeNamed } from './run-wait.spec.util.ts';
import { log, sleep, step, waitFor } from './suite-env.spec.util.ts';
import { holdsWithin, isAlive, stopRun, withLiveRun } from './tree-polish-live.spec.util.ts';
import { countRedraws, descriptionOf } from './tree-polish-tree.spec.util.ts';
import type { RunEntry } from '../../src/run/common/run.type.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import { CTRL_C, CTRL_C_PROVEN_PLATFORMS, CTRL_C_WAIT_MS, DEV_TASK_ID, POLISH_PACKAGE } from '../common/tree-polish.const.ts';

const CONTINUOUS_DESCRIPTION = /^continuous · \d+s$/u;

const STOPPED_DESCRIPTION = /^stopped · /u;

/** Spec 1c-a §6.4 case 4a: two reads this far apart must differ, as the clock runs once a second. */
const READ_GAP_MS = 1500;

/** How long the script's process may outlive its disposed terminal before it counts as having survived. */
const KILL_WAIT_MS = 3000;

const secondsOf = (description: string): number => Number(/(\d+)s$/u.exec(description)?.[1] ?? Number.NaN);

const devNode = async (api: TurboConsoleApi): Promise<TreeNode> => taskNodeNamed(api, POLISH_PACKAGE, DEV_TASK_ID);

const logExit = (label: string, entry: RunEntry): void => {
  log(`V1 ${label}: state ${entry.state}, exit code ${String(entry.exitCode)}, platform ${process.platform}`);
};

/**
 * Case 4a: after at least two ticker ticks the live row reads whole seconds, a later read differs, and the node was
 * redrawn once per tick; Stop then ends the run as `stopped`. A row counting from the wrong clock reads `0s` forever.
 */
export const liveRowCase = async (api: TurboConsoleApi): Promise<void> => {
  await step('L9-4a: a continuous row counts seconds on every tick and Stop ends it as stopped', async () => {
    const node = await devNode(api);

    await withLiveRun(api, node, async ({ launchedAt }) => {
      const redraws = countRedraws(api, node);
      const ticks = api.ticker.ticks();

      await waitFor('two ticker ticks', () => api.ticker.ticks() >= ticks + 2);

      const first = descriptionOf(api, node);
      const redrawn = redraws.count();

      redraws.dispose();
      await sleep(READ_GAP_MS);

      const second = descriptionOf(api, node);
      const ended = await stopRun(api, node, launchedAt);
      const stopped = descriptionOf(api, node);

      assert.match(first, CONTINUOUS_DESCRIPTION);
      assert.ok(secondsOf(first) >= 1, `first read: ${first}`);
      assert.notEqual(second, first);
      assert.ok(redrawn >= 2, `${redrawn} redraws of the running node over 2 ticks`);
      assert.equal(ended.state, 'stopped');
      assert.match(stopped, STOPPED_DESCRIPTION);
      logExit('Stop button', ended);
    });
  });
};

/**
 * Case 4b: Ctrl+C typed in the task terminal ends the run as `stopped` (V1a). Where `sendText` is proven to deliver SIGINT
 * a run that outlives it fails the case; elsewhere the case skips and says so.
 */
export const ctrlCCase = async (api: TurboConsoleApi): Promise<void> => {
  await step('L9-4b: Ctrl+C in the task terminal ends a continuous run as stopped', async () => {
    const node = await devNode(api);

    await withLiveRun(api, node, async ({ launchedAt, terminal }) => {
      const isEnded = (): boolean => api.runs.get(node.root, node.key)?.state !== 'running';

      terminal.sendText(CTRL_C, false);

      const hasEnded = await holdsWithin(isEnded, CTRL_C_WAIT_MS);
      const isProven = CTRL_C_PROVEN_PLATFORMS.has(process.platform);

      if (!hasEnded && isProven) throw new Error(`the run outlived Ctrl+C by ${CTRL_C_WAIT_MS} ms on ${process.platform}`);

      if (!hasEnded) {
        log(`V1: Ctrl+C not testable by sendText on ${process.platform}`);

        return;
      }

      const ended = await endedRun(api, node, launchedAt);

      logExit('Ctrl+C', ended);
      assert.equal(ended.state, 'stopped');
    });
  });
};

/** Case 4c: the task terminal disposed ends the run as `stopped` (V1b); logs whether the script's process outlived it. */
export const killCase = async (api: TurboConsoleApi): Promise<void> => {
  await step('L9-4c: a disposed task terminal ends a continuous run as stopped', async () => {
    const node = await devNode(api);

    await withLiveRun(api, node, async ({ launchedAt, pid, terminal }) => {
      terminal.dispose();

      const ended = await endedRun(api, node, launchedAt);
      const isGone = await holdsWithin(() => !isAlive(pid), KILL_WAIT_MS);

      logExit('terminal kill', ended);
      log(`V1 terminal kill: the script's process ${isGone ? 'ended' : 'survived'} on ${process.platform}`);
      assert.equal(ended.state, 'stopped');
    });
  });
};
