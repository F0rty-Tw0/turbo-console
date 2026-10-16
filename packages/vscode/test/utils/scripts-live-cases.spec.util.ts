import assert from 'node:assert/strict';

import * as vscode from 'vscode';

import { endedRun } from './run-wait.spec.util.ts';
import { withScriptRun } from './scripts-run.spec.util.ts';
import { listedPackages, scriptKeysOf, scriptNodeNamed, scriptsGroupOf } from './scripts-tree.spec.util.ts';
import { log, step } from './suite-env.spec.util.ts';
import { holdsWithin, stopRun } from './tree-polish-live.spec.util.ts';
import { logExit } from './tree-polish-run.spec.util.ts';
import { descriptionOf } from './tree-polish-tree.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import { LONG_TASK_ID, ONLY_LONG_TASK_ID, SCRIPTS_ONLY_PACKAGE, SCRIPTS_PACKAGE } from '../common/scripts.const.ts';
import { CTRL_C, CTRL_C_PROVEN_PLATFORMS, CTRL_C_WAIT_MS } from '../common/tree-polish.const.ts';

const longNode = async (api: TurboConsoleApi): Promise<TreeNode> => scriptNodeNamed(api, SCRIPTS_PACKAGE, LONG_TASK_ID);

/** Case 5a: Stop ends a running script as `stopped`. */
export const stopCase = async (api: TurboConsoleApi): Promise<void> => {
  await step('L10-5a: Stop ends a running script as stopped', async () => {
    const node = await longNode(api);

    await withScriptRun(api, node, async ({ launchedAt }) => {
      const ended = await stopRun(api, node, launchedAt);

      logExit('script Stop', ended);
      assert.equal(ended.state, 'stopped');
    });
  });
};

/** Case 5b: a disposed task terminal ends a running script as `stopped`. */
export const disposeCase = async (api: TurboConsoleApi): Promise<void> => {
  await step('L10-5b: a disposed task terminal ends a running script as stopped', async () => {
    const node = await longNode(api);

    await withScriptRun(api, node, async ({ launchedAt, terminal }) => {
      terminal.dispose();

      const ended = await endedRun(api, node, launchedAt);

      logExit('script terminal kill', ended);
      assert.equal(ended.state, 'stopped');
    });
  });
};

/**
 * Case 5c, as L9's 4b: Ctrl+C typed in the terminal ends a script run as `stopped` where `sendText` is proven to deliver
 * SIGINT. A run that outlives it fails there; elsewhere the case logs a skip and presses Stop (cmd asks "Terminate batch job
 * (Y/N)?"). A run that ended elsewhere has its code and state recorded only.
 */
export const ctrlCCase = async (api: TurboConsoleApi): Promise<void> => {
  await step('L10-5c: Ctrl+C in the task terminal ends a running script as stopped', async () => {
    const node = await longNode(api);

    await withScriptRun(api, node, async ({ launchedAt, terminal }) => {
      const isEnded = (): boolean => api.runs.get(node.root, node.key)?.state !== 'running';

      terminal.sendText(CTRL_C, false);

      const hasEnded = await holdsWithin(isEnded, CTRL_C_WAIT_MS);
      const isProven = CTRL_C_PROVEN_PLATFORMS.has(process.platform);

      if (!hasEnded && isProven) throw new Error(`the run outlived Ctrl+C by ${CTRL_C_WAIT_MS} ms on ${process.platform}`);

      if (!hasEnded) {
        log(`V1: Ctrl+C not testable by sendText on ${process.platform}`);
        await stopRun(api, node, launchedAt);

        return;
      }

      const ended = await endedRun(api, node, launchedAt);

      logExit('script Ctrl+C', ended);

      if (isProven) assert.equal(ended.state, 'stopped');
    });
  });
};

/**
 * Case 6: Hide Scripts while a script runs keeps its row, as `turboScript.running` under a Scripts group of that one row,
 * until Stop; then the group is gone. In a package of scripts only the package stays with that row until Stop, then
 * leaves the tree. Scripts are hidden when it returns.
 */
export const hideWhileRunningCase = async (api: TurboConsoleApi): Promise<void> => {
  await step('L10-6a: Hide Scripts keeps a running script under a group of one row until Stop', async () => {
    const node = await longNode(api);

    await withScriptRun(api, node, async ({ launchedAt }) => {
      await vscode.commands.executeCommand('turboConsole.hideScripts');

      const group = await scriptsGroupOf(api, SCRIPTS_PACKAGE);
      const keys = await scriptKeysOf(api, SCRIPTS_PACKAGE);
      const rowContext = api.tree.getTreeItem(node).contextValue;

      assert.equal(api.tree.isScriptsShown(), false);
      assert.ok(group !== undefined, `${SCRIPTS_PACKAGE} lost its Scripts group while a script runs`);
      assert.equal(descriptionOf(api, group), '1');
      assert.deepEqual(keys, [LONG_TASK_ID]);
      assert.equal(rowContext, 'turboScript.running');
      await stopRun(api, node, launchedAt);
      assert.equal(await scriptsGroupOf(api, SCRIPTS_PACKAGE), undefined);
    });
  });
  await step('L10-6b: Hide Scripts keeps a scripts-only package with its running script until Stop', async () => {
    await vscode.commands.executeCommand('turboConsole.showScripts');

    const node = await scriptNodeNamed(api, SCRIPTS_ONLY_PACKAGE, ONLY_LONG_TASK_ID);

    await withScriptRun(api, node, async ({ launchedAt }) => {
      await vscode.commands.executeCommand('turboConsole.hideScripts');

      const keys = await scriptKeysOf(api, SCRIPTS_ONLY_PACKAGE);
      const whileRunning = await listedPackages(api);

      assert.ok(whileRunning.includes(SCRIPTS_ONLY_PACKAGE), `the tree dropped ${SCRIPTS_ONLY_PACKAGE} while its script runs`);
      assert.deepEqual(keys, [ONLY_LONG_TASK_ID]);
      await stopRun(api, node, launchedAt);

      const afterStop = await listedPackages(api);

      assert.ok(!afterStop.includes(SCRIPTS_ONLY_PACKAGE), `the tree lists ${SCRIPTS_ONLY_PACKAGE} after Stop`);
    });
  });
};
