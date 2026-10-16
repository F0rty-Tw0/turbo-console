import assert from 'node:assert/strict';

import * as vscode from 'vscode';

import { endedRun, startRun, taskNodeNamed } from './run-wait.spec.util.ts';
import { sleep, step, waitFor } from './suite-env.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { SpawnCounter } from '../common/launch.type.ts';
import { DEV_TASK_ID, POLISH_PACKAGE } from '../common/tree-polish.const.ts';
import type { RunCost } from '../common/tree-polish.type.ts';

/** Spec 1c-a §6.4 case 6: the ticker stays flat this long while the tree is hidden. */
const HIDDEN_WINDOW_MS = 3000;

/** Long enough for two ticks to show, were the ticker still armed. */
const IDLE_WINDOW_MS = 2500;

/**
 * Case 6: the ticker ticks while a run goes and the tree shows, stays flat for 3 s once the tree is hidden, and stays flat
 * with no run once it shows again. Returns the turbo spawns the ticking cost.
 */
export const tickerCase = async (api: TurboConsoleApi, counter: SpawnCounter): Promise<number> => {
  let spawns = Number.NaN;

  await step('L9-6: the ticker ticks only while a run goes and the tree shows', async () => {
    const node = await taskNodeNamed(api, POLISH_PACKAGE, DEV_TASK_ID);
    const launchedAt = await startRun(api, node);
    const ticks = api.ticker.ticks();

    counter.reset();
    await waitFor('the ticker grows', () => api.ticker.ticks() > ticks);
    spawns = counter.count();

    await vscode.commands.executeCommand('workbench.view.explorer');
    await waitFor('tree hidden', () => !api.treeVisible());

    const hiddenTicks = api.ticker.ticks();

    await sleep(HIDDEN_WINDOW_MS);
    assert.equal(api.ticker.ticks(), hiddenTicks);

    await vscode.commands.executeCommand('turboConsole.stopTask', node);
    await endedRun(api, node, launchedAt);
    await vscode.commands.executeCommand('workbench.view.extension.turboConsole');
    await waitFor('tree visible', () => api.treeVisible());

    const idleTicks = api.ticker.ticks();

    await sleep(IDLE_WINDOW_MS);
    assert.equal(api.ticker.ticks(), idleTicks);
  });

  return spawns;
};

/**
 * Case 7: Run Without Cache costs one turbo process and the extension host spawns no turbo for it (the task's process
 * starts in VS Code's terminal, which the host's spawn counter cannot see), and the ticker spawns none either.
 */
export const spawnCase = async (forced: RunCost, ticking: number): Promise<void> => {
  await step('L9-7: a forced run costs one process and no host spawn, and the ticker none', () => {
    assert.equal(forced.starts, 1);
    assert.equal(forced.spawns, 0);
    assert.equal(ticking, 0);
  });
};
