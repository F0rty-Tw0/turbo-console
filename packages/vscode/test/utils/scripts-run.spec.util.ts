import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';

import { packageDirOf } from './package-edit.spec.util.ts';
import { startRun } from './run-wait.spec.util.ts';
import { scriptTerminals } from './scripts-shell.spec.util.ts';
import { waitFor } from './suite-env.spec.util.ts';
import { awaitTerminals, isAlive, pidIn, stopRun } from './tree-polish-live.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import { LONG_PID_PATH } from '../common/scripts.const.ts';
import type { LiveRun } from '../common/tree-polish.type.ts';

const isRunning = (api: TurboConsoleApi, node: TreeNode): boolean => api.runs.get(node.root, node.key)?.state === 'running';

/** Waits until the script wrote its pid (so its process runs) and the run holds exactly one task terminal. */
const readyRun = async (api: TurboConsoleApi, node: TreeNode, launchedAt: number, pidFile: string): Promise<LiveRun> => {
  const startedAt = (): number | null => api.runs.get(node.root, node.key)?.processStartedAt ?? null;
  const hasStarted = (): boolean => startedAt() !== null;

  await waitFor('process started', hasStarted);
  await waitFor('script started', () => pidIn(pidFile) !== null);

  const terminals = await awaitTerminals(node.key, () => scriptTerminals(node.key));
  const pid = pidIn(pidFile) ?? Number.NaN;
  const [terminal] = terminals;

  assert.equal(terminals.length, 1, `terminals of ${node.key}: ${terminals.map((candidate) => candidate.name).join(', ')}`);

  if (terminal === undefined) throw new Error(`no terminal of ${node.key}`);

  const live: LiveRun = { launchedAt, pid, terminal };

  return live;
};

/** Whatever the body did, no run of the script, terminal or process outlives it. */
const cleanUp = async (api: TurboConsoleApi, node: TreeNode, live: LiveRun | null, launchedAt: number): Promise<void> => {
  const isLive = isRunning(api, node);

  if (isLive) await stopRun(api, node, launchedAt);

  for (const terminal of scriptTerminals(node.key)) terminal.dispose();

  if (live === null) return;

  const hasSurvivor = isAlive(live.pid);

  if (hasSurvivor) process.kill(live.pid);
};

/**
 * Runs `body` on a run of the pid-writing script `node` whose process has started: the run ends and its terminal and
 * process go even when `body` fails, so a failed case cannot leave `zz-long` running into the next.
 */
export const withScriptRun = async (api: TurboConsoleApi, node: TreeNode, body: (live: LiveRun) => Promise<void>): Promise<void> => {
  if (node.packageName === null) throw new Error(`${node.key} names no package`);

  const dir = await packageDirOf(node.root, node.packageName);
  const pidFile = join(dir, ...LONG_PID_PATH);
  let live: LiveRun | null = null;

  await rm(pidFile, { force: true });

  const launchedAt = await startRun(api, node);

  try {
    live = await readyRun(api, node, launchedAt, pidFile);
    await body(live);
  } finally {
    await cleanUp(api, node, live, launchedAt);
  }
};
