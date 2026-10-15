import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { POSIX_DAEMON_PATTERN, WINDOWS_DAEMON_PROBE } from '../common/peak-rss.const.ts';

const execFileAsync = promisify(execFile);

const isExitCodeOne = (error: unknown): boolean => error instanceof Error && 'code' in error && error.code === 1;

/** Ids of turbo daemon processes still alive, or `none`; `pgrep` exits 1 when it matches nothing. */
export const daemonReport = async (): Promise<string> => {
  const isWindows = process.platform === 'win32';
  const file = isWindows ? 'pwsh' : 'pgrep';
  const windowsArgs = ['-NoProfile', '-Command', WINDOWS_DAEMON_PROBE];
  const posixArgs = ['-f', POSIX_DAEMON_PATTERN];
  const args = isWindows ? windowsArgs : posixArgs;

  try {
    const { stdout } = await execFileAsync(file, args);
    const ids = stdout.trim().split(/\r?\n/).join(',');

    return ids || 'none';
  } catch (error) {
    const matchedNothing = isExitCodeOne(error);

    if (matchedNothing) return 'none';

    throw error;
  }
};
