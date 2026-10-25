import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';

import * as vscode from 'vscode';

import { packageDirOf } from './package-edit.spec.util.ts';
import { endedRun, startRun } from './run-wait.spec.util.ts';
import { waitFor } from './suite-env.spec.util.ts';
import type { RunEntry } from '../../src/run/common/run.type.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import { DEV_PID_PATH, DEV_TASK_ID, POLISH_PACKAGE } from '../common/tree-polish.const.ts';
import type { Launch, LiveRun } from '../common/tree-polish.type.ts';

/** The pid `DEV_SCRIPT` wrote, or `null` while the file is missing or half written. */
export const pidIn = (file: string): number | null => {
  const hasFile = existsSync(file);

  if (!hasFile) return null;

  const pid = Number(readFileSync(file, 'utf8'));
  const isWhole = Number.isInteger(pid);
  const isPid = isWhole && pid > 0;

  if (!isPid) return null;

  return pid;
};

const devTerminals = (): vscode.Terminal[] => vscode.window.terminals.filter((candidate) => candidate.name.includes(DEV_TASK_ID));

/**
 * The terminals `read` lists that are not in `stale`, once it lists one. A read right after the task's process start or
 * the script's pid file has seen no matching terminal: the extension host may create it, or name it, later, and polling
 * the filtered read covers both. `stale` holds the terminals listed before the run started: a disposed one stays listed
 * until the host's close round trip, so it must not pass for the new run's terminal.
 */
export const awaitTerminals = async (
  name: string,
  read: () => vscode.Terminal[],
  stale: vscode.Terminal[]
): Promise<vscode.Terminal[]> => {
  const fresh = (): vscode.Terminal[] => read().filter((candidate) => !stale.includes(candidate));

  await waitFor(`terminal of ${name}`, () => fresh().length > 0);

  return fresh();
};

const isRunning = (api: TurboConsoleApi, node: TreeNode): boolean => api.runs.get(node.root, node.key)?.state === 'running';

export const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);

    return true;
  } catch {
    return false;
  }
};

/** Whether `isDone` holds within `limitMs`; a timeout is `false`, not an error. */
export const holdsWithin = async (isDone: () => boolean, limitMs: number): Promise<boolean> => {
  try {
    await waitFor('condition', isDone, limitMs);

    return true;
  } catch {
    return false;
  }
};

export const stopRun = async (api: TurboConsoleApi, node: TreeNode, launchedAt: number): Promise<RunEntry> => {
  await vscode.commands.executeCommand('turboConsole.stopTask', node);

  return endedRun(api, node, launchedAt);
};

/** Starts a run of `node`, noting the terminals listed first: a disposed one stays listed until the host's close round trip. */
export const launchRun = async (api: TurboConsoleApi, node: TreeNode): Promise<Launch> => {
  const stale = [...vscode.window.terminals];
  const launchedAt = await startRun(api, node);
  const launch: Launch = { launchedAt, stale };

  return launch;
};

/** Waits until the script wrote its pid (so its process runs) and the run holds exactly one task terminal. */
const readyRun = async (api: TurboConsoleApi, node: TreeNode, launch: Launch, pidFile: string): Promise<LiveRun> => {
  const startedAt = (): number | null => api.runs.get(node.root, node.key)?.processStartedAt ?? null;
  const hasStarted = (): boolean => startedAt() !== null;

  await waitFor('process started', hasStarted);
  await waitFor('dev script started', () => pidIn(pidFile) !== null);

  const terminals = await awaitTerminals(DEV_TASK_ID, devTerminals, launch.stale);
  const pid = pidIn(pidFile) ?? Number.NaN;
  const [terminal] = terminals;

  assert.equal(terminals.length, 1, `terminals of ${DEV_TASK_ID}: ${terminals.map((candidate) => candidate.name).join(', ')}`);

  if (terminal === undefined) throw new Error(`no terminal of ${DEV_TASK_ID}`);

  const live: LiveRun = { launchedAt: launch.launchedAt, pid, terminal };

  return live;
};

/** Whatever the body did, no `dev` run, terminal or process outlives it. */
const cleanUp = async (api: TurboConsoleApi, node: TreeNode, live: LiveRun | null, launchedAt: number): Promise<void> => {
  const isLive = isRunning(api, node);

  if (isLive) await stopRun(api, node, launchedAt);

  for (const terminal of devTerminals()) terminal.dispose();

  if (live === null) return;

  const hasSurvivor = isAlive(live.pid);

  if (hasSurvivor) process.kill(live.pid);
};

/**
 * Runs `body` on a continuous `dev` run whose script has started: the run ends and its terminal and process go even when
 * `body` fails, so a failed case cannot leave `dev` running into the next.
 */
export const withLiveRun = async (api: TurboConsoleApi, node: TreeNode, body: (live: LiveRun) => Promise<void>): Promise<void> => {
  const dir = await packageDirOf(node.root, POLISH_PACKAGE);
  const pidFile = join(dir, ...DEV_PID_PATH);
  let live: LiveRun | null = null;

  await rm(pidFile, { force: true });

  const launch = await launchRun(api, node);
  const { launchedAt } = launch;

  try {
    live = await readyRun(api, node, launch, pidFile);
    await body(live);
  } finally {
    await cleanUp(api, node, live, launchedAt);
  }
};
