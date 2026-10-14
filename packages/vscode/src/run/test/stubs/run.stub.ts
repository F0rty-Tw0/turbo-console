import { TASK_NODE_STUB } from '../../../tree/test/stubs/workspace-model.stub.ts';
import type { RunEntry } from '../../common/run.type.ts';

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
  matching: false
};
