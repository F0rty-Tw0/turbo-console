import type { ChildProcess } from 'node:child_process';
import { once } from 'node:events';

import { turboEnv } from '../../utils/turbo-env.util.ts';

/** How long a stopped run gets to exit after SIGINT before its group is killed. */
const STOP_GRACE_MS = 20_000;

/**
 * Signals the process group `child` leads (it was spawned `detached`), as Ctrl+C in a terminal signals the foreground
 * group. Turbo runs the package manager in a group of its own and relays the signal to it, so the script ends as well.
 * Where there is no group to signal, only `child`.
 */
export const signalGroup = (child: ChildProcess, signal: NodeJS.Signals): void => {
  const { pid } = child;

  if (pid === undefined) return;

  try {
    process.kill(-pid, signal);
  } catch {
    child.kill(signal);
  }
};

/** The exit code of `child`, waiting for it when it still runs; `null` when a signal ended it; rejects when it errors. */
export const waitForExit = async (child: ChildProcess): Promise<number | null> => {
  if (child.exitCode !== null || child.signalCode !== null) return child.exitCode;

  await once(child, 'exit');

  return child.exitCode;
};

/** The exit code of `child`, which has exited; throws when a signal killed it, so there is no code. */
export const exitCodeOf = (child: ChildProcess): number => {
  if (child.exitCode === null) throw new Error(`turbo was killed by ${child.signalCode}`);

  return child.exitCode;
};

/** Ends a run as Ctrl+C would, so turbo stops its tasks too; kills the group when it has not exited by then. */
export const stopRun = async (child: ChildProcess): Promise<number | null> => {
  signalGroup(child, 'SIGINT');
  const killTimer = setTimeout(() => signalGroup(child, 'SIGKILL'), STOP_GRACE_MS);

  try {
    const code = await waitForExit(child);

    return code;
  } finally {
    clearTimeout(killTimer);
  }
};

/**
 * The core turbo env with `overlay` on top and turbo's output streamed: under GITHUB_ACTIONS turbo otherwise holds a
 * task's output until the task ends. An inherited `TURBO_LOG_FILE` is dropped, so only `overlay` or a flag asks for a log.
 */
export const streamedTurboEnv = (overlay: Record<string, string>): NodeJS.ProcessEnv => {
  const env = turboEnv(process.env);

  delete env['TURBO_LOG_FILE'];
  env['TURBO_LOG_ORDER'] = 'stream';
  Object.assign(env, overlay);

  return env;
};
