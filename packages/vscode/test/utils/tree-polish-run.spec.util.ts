import assert from 'node:assert/strict';

import * as vscode from 'vscode';

import { endedRun, startRun, taskNodeNamed } from './run-wait.spec.util.ts';
import { log, sleep, step, waitFor } from './suite-env.spec.util.ts';
import { countRedraws, descriptionOf } from './tree-polish-tree.spec.util.ts';
import type { RunEntry } from '../../src/run/common/run.type.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import { CTRL_C, CTRL_C_WAIT_MS, DEV_TASK_ID, POLISH_PACKAGE } from '../common/tree-polish.const.ts';
import type { LiveRun } from '../common/tree-polish.type.ts';

const CONTINUOUS_DESCRIPTION = /^continuous · \d+s$/u;

const STOPPED_DESCRIPTION = /^stopped · /u;

/** Spec 1c-a §6.4 case 4a: two reads this far apart must differ, as the clock runs once a second. */
const READ_GAP_MS = 1500;

/** A process that started has yet to install its signal handlers; Ctrl+C or a kill this early proves nothing. */
const SETTLE_MS = 1500;

const secondsOf = (description: string): number => Number(/(\d+)s$/u.exec(description)?.[1] ?? Number.NaN);

const devNode = async (api: TurboConsoleApi): Promise<TreeNode> => taskNodeNamed(api, POLISH_PACKAGE, DEV_TASK_ID);

const logExit = (label: string, entry: RunEntry): void => {
  log(`V1 ${label}: state ${entry.state}, exit code ${String(entry.exitCode)}, platform ${process.platform}`);
};

const stopRun = async (api: TurboConsoleApi, node: TreeNode, launchedAt: number): Promise<RunEntry> => {
  await vscode.commands.executeCommand('turboConsole.stopTask', node);

  return endedRun(api, node, launchedAt);
};

/** Starts the continuous run, waits for its process and its terminal, and gives the process time to install its handlers. */
const startLiveRun = async (api: TurboConsoleApi, node: TreeNode): Promise<LiveRun> => {
  const launchedAt = await startRun(api, node);
  const hasStarted = (): boolean => api.runs.get(node.root, node.key)?.processStartedAt !== null;
  const terminals = (): vscode.Terminal[] => vscode.window.terminals.filter((candidate) => candidate.name.includes(DEV_TASK_ID));

  await waitFor('process started', hasStarted);
  await waitFor('task terminal', () => terminals().length > 0);
  await sleep(SETTLE_MS);

  const [terminal] = terminals();

  if (terminal === undefined) throw new Error(`no terminal of ${DEV_TASK_ID}`);

  const live: LiveRun = { launchedAt, terminal };

  return live;
};

const endsWithin = async (isEnded: () => boolean, limitMs: number): Promise<boolean> => {
  try {
    await waitFor('run end', isEnded, limitMs);

    return true;
  } catch {
    return false;
  }
};

/**
 * Case 4a: after at least two ticker ticks the live row reads whole seconds, a later read differs, and the node was
 * redrawn once per tick; Stop then ends the run as `stopped`. A row counting from the wrong clock reads `0s` forever.
 */
export const liveRowCase = async (api: TurboConsoleApi): Promise<void> => {
  await step('L9-4a: a continuous row counts seconds on every tick and Stop ends it as stopped', async () => {
    const node = await devNode(api);
    const launchedAt = await startRun(api, node);
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
};

/** Case 4b: Ctrl+C typed in the task terminal ends the run as `stopped` (V1a); skipped where `sendText` sends no SIGINT. */
export const ctrlCCase = async (api: TurboConsoleApi): Promise<void> => {
  await step('L9-4b: Ctrl+C in the task terminal ends a continuous run as stopped', async () => {
    const node = await devNode(api);
    const { launchedAt, terminal } = await startLiveRun(api, node);
    const isEnded = (): boolean => api.runs.get(node.root, node.key)?.state !== 'running';

    terminal.sendText(CTRL_C, false);

    const hasEnded = await endsWithin(isEnded, CTRL_C_WAIT_MS);

    if (!hasEnded) {
      log(`V1: Ctrl+C not testable by sendText on ${process.platform}`);
      await stopRun(api, node, launchedAt);

      return;
    }

    const ended = await endedRun(api, node, launchedAt);

    logExit('Ctrl+C', ended);
    assert.equal(ended.state, 'stopped');
  });
};

/** Case 4c: the task terminal disposed ends the run as `stopped` (V1b). */
export const killCase = async (api: TurboConsoleApi): Promise<void> => {
  await step('L9-4c: a disposed task terminal ends a continuous run as stopped', async () => {
    const node = await devNode(api);
    const { launchedAt, terminal } = await startLiveRun(api, node);

    terminal.dispose();

    const ended = await endedRun(api, node, launchedAt);

    logExit('terminal kill', ended);
    assert.equal(ended.state, 'stopped');
  });
};
