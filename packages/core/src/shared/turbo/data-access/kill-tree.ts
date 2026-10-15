import { execFile } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';

import { system32Path } from '../utils/system32-path.util.ts';

/**
 * Stops `child`'s tree. POSIX: SIGTERM to `child` alone, settled at once; turbo stops its own task processes on it,
 * a task that ignores SIGTERM keeps running. Windows: `taskkill /T /F`, which kills the whole tree (a plain kill would
 * leave turbo's task processes running), settled once taskkill has finished, after a plain kill of `child` when it
 * fails. Never rejects.
 */
export const killTree = async (child: ChildProcess): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<undefined>();

  if (process.platform !== 'win32' || child.pid === undefined) {
    child.kill('SIGTERM');
    resolve(undefined);

    return promise;
  }

  const onDone = (error: Error | null): void => {
    if (error !== null) child.kill();

    resolve(undefined);
  };

  const taskkill = system32Path('taskkill.exe', process.env['SystemRoot']);

  execFile(taskkill, ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }, onDone);

  return promise;
};
