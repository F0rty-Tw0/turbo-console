import { join } from 'node:path';

import { RUN_LOG_FILE_PATTERN, RUN_LOG_SWEEP_AGE_MS } from '../common/run-log-tail.const.ts';
import type { RunLogPorts } from '../common/run-log-tail.type.ts';

type IsLive = (fileName: string) => boolean;

const sweepOne = async (ports: RunLogPorts, dir: string, name: string, isLive: IsLive): Promise<void> => {
  const path = join(dir, name);
  const mtime = await ports.modifiedAt(path);
  const now = ports.now();
  const isOld = mtime !== null && now - mtime > RUN_LOG_SWEEP_AGE_MS;

  if (!isOld) return;

  const isOwned = isLive(name);

  if (!isOwned) await ports.remove(path);
};

const sweepQuietly = async (ports: RunLogPorts, dir: string, name: string, isLive: IsLive): Promise<void> => {
  try {
    await sweepOne(ports, dir, name, isLive);
  } catch {
    return;
  }
};

/**
 * Removes the run files of `dir` older than 24 h that no live tail owns (`isLive` takes a file name and is asked just
 * before the remove): what turbo wrote for a run that never reached its drain, e.g. after an editor crash. A file
 * that rejects (say, busy on Windows) is skipped quietly and the sweep goes on; a folder that cannot be listed ends it.
 */
export const sweepRunLogs = async (ports: RunLogPorts, dir: string, isLive: IsLive): Promise<void> => {
  try {
    const names = await ports.list(dir);
    const candidates = names.filter((name) => RUN_LOG_FILE_PATTERN.test(name));

    for (const name of candidates) await sweepQuietly(ports, dir, name, isLive);
  } catch {
    return;
  }
};
