import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { runSummarySchema } from '@turbo-console/core';
import type { RunMatch, RunSummary } from '@turbo-console/core';
import * as vscode from 'vscode';

import { log, waitFor } from './suite-env.spec.util.ts';
import { packageNodeNamed } from './tree-walk.spec.util.ts';
import type { RunEntry } from '../../src/run/common/run.type.ts';
import type { RunTiming, TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';

/** Spec §5.3 case 2: a run and its summary lookup settle within this. */
const RUN_LIMIT_MS = 60_000;

/** The cached node of task `taskId` under package `name`. */
export const taskNodeNamed = async (api: TurboConsoleApi, name: string, taskId: string): Promise<TreeNode> => {
  const pkg = await packageNodeNamed(api, name);
  const children = await api.tree.getChildren(pkg);
  const node = children.find((child) => child.key === taskId);

  if (node === undefined) throw new Error(`${name} shows no task ${taskId}`);

  return node;
};

/** Runs the task of `node` as its inline Run button does; returns the run's launch token once VS Code holds it. */
export const startRun = async (api: TurboConsoleApi, node: TreeNode): Promise<number> => {
  const clickedAt = Date.now();

  await vscode.commands.executeCommand('turboConsole.runTask', node);

  const entry = api.runs.get(node.root, node.key);
  const isThisRun = entry !== undefined && entry.launchedAt >= clickedAt;

  if (!isThisRun) throw new Error(`no run of ${node.key} started`);

  return entry.launchedAt;
};

/** The run of `node` launched at `launchedAt`, once it ended and its summary lookup settled. */
export const endedRun = async (api: TurboConsoleApi, node: TreeNode, launchedAt: number): Promise<RunEntry> => {
  const current = (): RunEntry | undefined => api.runs.get(node.root, node.key);
  const isSettled = (): boolean => {
    const entry = current();
    const isThisRun = entry?.launchedAt === launchedAt;

    return isThisRun && entry.state !== 'running' && !entry.matching;
  };

  await waitFor(`run of ${node.key}`, isSettled, RUN_LIMIT_MS);

  const entry = current();

  if (entry === undefined) throw new Error(`the run of ${node.key} is gone`);

  return entry;
};

const runsDir = (root: string): string => join(root, '.turbo', 'runs');

/** The names of the run summary files turbo wrote under `root` so far. */
export const summaryNames = async (root: string): Promise<string[]> => readdir(runsDir(root));

const readSummary = async (root: string, name: string): Promise<RunSummary> => {
  const text = await readFile(join(runsDir(root), name), 'utf8');
  const summary: unknown = JSON.parse(text);

  return runSummarySchema.parse(summary);
};

/**
 * What the one summary written since `before` whose command is `command` says of task `taskId`: the cache status of its
 * entry and that entry's duration. Throws unless exactly one new summary ran `command` and it lists the task.
 */
export const summaryMatch = async (root: string, before: string[], command: string, taskId: string): Promise<RunMatch> => {
  const names = await summaryNames(root);
  const fresh = names.filter((name) => !before.includes(name));
  const summaries = await Promise.all(fresh.map(async (name) => readSummary(root, name)));
  const own = summaries.filter((summary) => summary.execution.command === command);
  const [summary] = own;

  if (own.length !== 1 || summary === undefined) throw new Error(`${own.length} new summaries ran ${command}`);

  const entry = summary.tasks.find((task) => task.taskId === taskId);

  if (entry === undefined) throw new Error(`the summary of ${command} lists no ${taskId}`);

  const { startTime, endTime } = entry.execution;
  const match: RunMatch = { cache: entry.cache.status, durationMs: endTime - startTime };

  return match;
};

/** When the process of the run of `taskId` launched at `launchedAt` started, from `timings.runs`. */
export const processStartOf = (api: TurboConsoleApi, taskId: string, launchedAt: number): number => {
  const isThisRun = (timing: RunTiming): boolean => timing.taskId === taskId && timing.clickedAt === launchedAt;
  const timing = api.timings.runs.find(isThisRun);
  const started = timing?.processStartedAt ?? null;

  if (started === null) throw new Error(`the run of ${taskId} recorded no process start`);

  return started;
};

const latencyText = (timing: RunTiming): string => {
  const started = timing.processStartedAt;

  if (started === null) return 'never started';

  return `${started - timing.clickedAt} ms`;
};

/** Logs every run's click to process start, so CI records how close a start comes to the 10 s watchdog. */
export const logRunStarts = (api: TurboConsoleApi): void => {
  for (const timing of api.timings.runs) log(`run start ${timing.taskId}: ${latencyText(timing)}`);
};
