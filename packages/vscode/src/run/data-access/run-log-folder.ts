import type { RunLogPorts } from '../common/run-log-tail.type.ts';
import { runLogDirOf } from '../utils/run-log-dir.util.ts';
import { runLogDirErrorText } from '../utils/run-text.util.ts';

/** Makes the log folder of `root` before a run; `false`, with the failure handed to `logOnce`, when it cannot be made. */
export const prepareRunLogDir = async (ports: RunLogPorts, root: string, logOnce: (line: string) => void): Promise<boolean> => {
  const dir = runLogDirOf(root);

  try {
    await ports.makeDir(dir);
  } catch (error) {
    logOnce(runLogDirErrorText(dir, error));

    return false;
  }

  return true;
};
