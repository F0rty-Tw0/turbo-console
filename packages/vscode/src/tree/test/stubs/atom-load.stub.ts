import type { AtomResult, DryRunState, TaskDefinition } from '@turbo-console/core';

import { FILE_A } from '../common/atom-load.const.ts';

export const TASK_DEFINITION_STUB: TaskDefinition = {
  inputs: [],
  outputs: [],
  dependsOn: [],
  cache: true,
  persistent: false,
  env: []
};

export const DRY_RUN_STATE_STUB: DryRunState = {
  id: FILE_A,
  hash: 'abc',
  cache: 'HIT',
  definition: TASK_DEFINITION_STUB
};

export const ATOM_RESULT_STUB: AtomResult = { outcome: 'passed', durationMs: 4200, endedAt: 1 };
