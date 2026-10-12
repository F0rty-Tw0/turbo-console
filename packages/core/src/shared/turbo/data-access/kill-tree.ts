import { execFile } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { isAbsolute, join } from 'node:path';

/** By absolute path, so a `taskkill.exe` earlier on `PATH` or in the cwd is never run; a relative `SystemRoot` is ignored. */
const taskkillPath = (): string => {
  const root = process.env['SystemRoot'] ?? '';
  const isRootAbsolute = isAbsolute(root);
  const base = isRootAbsolute ? root : 'C:\\Windows';

  return join(base, 'System32', 'taskkill.exe');
};

/**
 * Asks `child` and its descendants to stop: SIGTERM on POSIX (turbo stops its own task processes on it), settled at
 * once; on Windows, where a plain kill would leave turbo's task processes running, `taskkill /T /F`, settled once
 * taskkill has finished (after a plain kill when it fails). Never rejects.
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

  execFile(taskkillPath(), ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }, onDone);

  return promise;
};
