import { join } from 'node:path';

import { PACKAGE_MANAGER_STUB, TASK_NODE_STUB } from '../../../tree/test/stubs/workspace-model.stub.ts';
import type { RunEntry, RunEnv, RunRequest } from '../../common/run.type.ts';
import { logEnvOf } from '../utils/run-log-env.spec.util.ts';

export const RUN_ENTRY_STUB: RunEntry = {
  root: '/ws',
  taskId: 'a#build',
  packageName: 'a',
  task: TASK_NODE_STUB,
  state: 'running',
  launchedAt: 1000,
  processStartedAt: null,
  endedAt: null,
  exitCode: null,
  stopRequested: false,
  match: null,
  matching: false,
  outcomes: null,
  force: false,
  packageManager: null
};

export const RUN_REQUEST_STUB: RunRequest = {
  root: '/ws',
  packageName: 'a',
  packageDir: join('/ws', 'packages/a'),
  packageManager: PACKAGE_MANAGER_STUB,
  task: TASK_NODE_STUB,
  binaryPath: '/bin/turbo',
  force: false,
  singlePackage: false
};

/** The env turbo gets for the run launched at 1000, with the fake random id. */
export const LOG_ENV_STUB: RunEnv = logEnvOf(1000);

/** The args of a turbo run of `RUN_REQUEST_STUB`. */
export const TURBO_ARGS_STUB: string[] = ['--skip-infer', 'run', 'build', '--filter=a', '--summarize'];
