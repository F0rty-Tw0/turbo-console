import * as vscode from 'vscode';

import { endedRun } from './run-wait.spec.util.ts';
import { waitFor } from './suite-env.spec.util.ts';
import { RUN_ALL_PREFIX } from '../../src/run/common/run.const.ts';
import type { RunEntry } from '../../src/run/common/run.type.ts';
import { runAllDefinitionOf } from '../../src/run/utils/run-all-task.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import type { AllRunWatch, ProcessExit } from '../common/parity.type.ts';

/** A run starts, and its process starts, within this of the pick that launched it. */
const START_LIMIT_MS = 10_000;

const RUN_LIMIT_MS = 60_000;

/** The run of `node`'s task that launched at or after `since`, once it ended and its summary lookup settled. */
export const settledRunSince = async (api: TurboConsoleApi, node: TreeNode, since: number): Promise<RunEntry> => {
  const current = (): RunEntry | undefined => api.runs.get(node.root, node.key);
  const isStarted = (): boolean => {
    const entry = current();

    return entry !== undefined && entry.launchedAt >= since;
  };

  await waitFor(`start of the run of ${node.key}`, isStarted, START_LIMIT_MS);

  const started = current();

  if (started === undefined) throw new Error(`the run of ${node.key} is gone`);

  return endedRun(api, node, started.launchedAt);
};

const isWatched = (task: vscode.Task, root: string, taskName: string, affected: boolean): boolean => {
  const definition = runAllDefinitionOf(task.definition);

  if (definition === null) return false;

  const id = `${RUN_ALL_PREFIX}${taskName}`;
  const isSameTask = definition.root === root && definition.id === id;

  return isSameTask && definition.affected === affected;
};

const argsOf = (task: vscode.Task): string[] | null => {
  const { execution } = task;
  const isProcess = execution instanceof vscode.ProcessExecution;

  if (!isProcess) return null;

  return execution.args;
};

/** Watches the process of the run all task of `taskName` in `root`, with the given `affected` flag, from its start and end events. */
export const watchAllRun = (root: string, taskName: string, affected: boolean): AllRunWatch => {
  let started: string[] | null = null;
  let ended: ProcessExit | null = null;

  const onStart = ({ execution }: vscode.TaskProcessStartEvent): void => {
    const isWatchedTask = isWatched(execution.task, root, taskName, affected);

    if (isWatchedTask) started = argsOf(execution.task);
  };
  const onEnd = ({ execution, exitCode }: vscode.TaskProcessEndEvent): void => {
    const isWatchedTask = isWatched(execution.task, root, taskName, affected);

    if (isWatchedTask) ended = { code: exitCode };
  };
  const listeners = vscode.Disposable.from(vscode.tasks.onDidStartTaskProcess(onStart), vscode.tasks.onDidEndTaskProcess(onEnd));
  const watch: AllRunWatch = {
    startedArgs: () => started,
    exit: () => ended,
    dispose: () => {
      listeners.dispose();
    }
  };

  return watch;
};

/** Waits for the watched process to start and end; returns the args it started with and its exit code. */
export const finishedAllRun = async (watch: AllRunWatch, name: string): Promise<[string[], number | undefined]> => {
  await waitFor(`${name} process start`, () => watch.startedArgs() !== null, START_LIMIT_MS);
  await waitFor(`${name} process end`, () => watch.exit() !== null, RUN_LIMIT_MS);

  const args = watch.startedArgs();
  const exit = watch.exit();

  if (args === null || exit === null) throw new Error(`${name} left no process events`);

  return [args, exit.code];
};
