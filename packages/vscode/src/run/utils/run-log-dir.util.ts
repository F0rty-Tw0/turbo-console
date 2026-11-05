import { join } from 'node:path';

import { RUN_LOG_DIR_PARTS } from '../common/run-log-tail.const.ts';

/** The folder under `root` where turbo writes its log files (spec D6). */
export const runLogDirOf = (root: string): string => join(root, ...RUN_LOG_DIR_PARTS);
