import type { AtomResult, DryRunState, TaskDefinition, WorkspaceModel } from '@turbo-console/core';

import { FILE_A } from '../common/atom-loads.const.ts';
import { atomModelOf } from '../utils/atom-model.spec.util.ts';

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

/** Package `@fx/e2e` with group `e2e-ci` over `tests/a.spec.ts` and `tests/b fails.spec.ts`. */
export const BASE_MODEL_STUB: WorkspaceModel = atomModelOf(['tests/a.spec.ts', 'tests/b fails.spec.ts']);
