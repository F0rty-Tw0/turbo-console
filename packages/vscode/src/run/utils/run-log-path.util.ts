import { join } from 'node:path';

import { runLogDirOf } from './run-log-dir.util.ts';
import { RUN_LOG_DIR_PARTS } from '../common/run-log-tail.const.ts';
import type { RunLogPath } from '../common/run-log-tail.type.ts';

/** The log path of the run of `root` launched at `launchedAt`; `id` tells apart two windows launching in one millisecond. */
export const runLogPathOf = (root: string, launchedAt: number, id: string): RunLogPath => {
  const name = `run-${launchedAt}-${id}.json`;
  const parts = [...RUN_LOG_DIR_PARTS, name];
  const env = parts.join('/');
  const file = join(runLogDirOf(root), name);
  const path: RunLogPath = { env, file };

  return path;
};
