import assert from 'node:assert/strict';

import * as vscode from 'vscode';

import { endedRun, startRun, startRunWith, taskNodeNamed } from './run-wait.spec.util.ts';
import { log, step } from './suite-env.spec.util.ts';
import { descriptionOf } from './tree-polish-tree.spec.util.ts';
import type { RunEntry } from '../../src/run/common/run.type.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import type { SpawnCounter } from '../common/launch.type.ts';
import { BUILD_TASK_ID, POLISH_PACKAGE } from '../common/tree-polish.const.ts';
import type { RunCost, StartedArgs } from '../common/tree-polish.type.ts';

const CACHED_DESCRIPTION = /^\d+\.\ds · cached$/u;

const PLAIN_DESCRIPTION = /^\d+\.\ds$/u;

const FORCE_ARGS = ['--summarize', '--force'];

/** The args of the process of the task named `taskName`, read as VS Code starts it (it is gone from `taskExecutions` once it ends). */
const watchStartedArgs = (taskName: string): StartedArgs => {
  let args: string[] = [];
  let starts = 0;
  const listening = vscode.tasks.onDidStartTask((event) => {
    const { task } = event.execution;
    const { execution } = task;
    const isProcessOfTask = task.name === taskName && execution instanceof vscode.ProcessExecution;

    if (!isProcessOfTask) return;

    args = execution.args;
    starts += 1;
  });
  const started: StartedArgs = {
    starts: () => starts,
    args: () => args,
    dispose: () => {
      listening.dispose();
    }
  };

  return started;
};

const buildNode = async (api: TurboConsoleApi): Promise<TreeNode> => taskNodeNamed(api, POLISH_PACKAGE, BUILD_TASK_ID);

const plainRun = async (api: TurboConsoleApi, node: TreeNode): Promise<RunEntry> => {
  const launchedAt = await startRun(api, node);

  return endedRun(api, node, launchedAt);
};

/** Case 5a: the second plain run of `build` is a cache hit, which the row says. Nothing in the package changes between the runs. */
export const cachedRunCase = async (api: TurboConsoleApi): Promise<void> => {
  await step('L9-5: the second plain run of build ends cached', async () => {
    const node = await buildNode(api);
    const first = await plainRun(api, node);
    const second = await plainRun(api, node);
    const item = api.tree.getTreeItem(node);

    log(`first run ${first.state} "${first.match?.cache}", second run ${second.state} "${descriptionOf(api, node)}"`);
    assert.equal(first.state, 'passed');
    assert.equal(second.state, 'passed');
    assert.equal(second.match?.cache, 'HIT');
    assert.match(descriptionOf(api, node), CACHED_DESCRIPTION);
    assert.equal(item.contextValue, 'turboTask.cached');
  });
};

/** Case 5b: Run Without Cache passes with a `MISS`, passes `--summarize --force`, and returns what it cost. */
export const forcedRunCase = async (api: TurboConsoleApi, counter: SpawnCounter): Promise<RunCost> => {
  let cost: RunCost = { starts: Number.NaN, spawns: Number.NaN };

  await step('L9-5: Run Without Cache ends passed, matched MISS, with --summarize --force', async () => {
    const node = await buildNode(api);
    const started = watchStartedArgs(BUILD_TASK_ID);

    counter.reset();

    try {
      const launchedAt = await startRunWith(api, node, 'turboConsole.runTaskWithoutCache');
      const ended = await endedRun(api, node, launchedAt);

      cost = { starts: started.starts(), spawns: counter.count() };
      assert.equal(ended.state, 'passed');
      assert.equal(ended.match?.cache, 'MISS');
      assert.deepEqual(started.args().slice(-FORCE_ARGS.length), FORCE_ARGS);
    } finally {
      started.dispose();
    }

    assert.match(descriptionOf(api, node), PLAIN_DESCRIPTION);
    assert.equal(api.tree.getTreeItem(node).contextValue, 'turboTask');
  });

  return cost;
};
