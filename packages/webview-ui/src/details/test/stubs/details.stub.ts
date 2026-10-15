import type { TaskDefinition } from '@turbo-console/core';

import type { RunView, TaskCard } from '../../../bridge/common/details-state.type.ts';

export const RUN_VIEW_STUB: RunView = { iconId: 'tools', colorVar: null, text: '', isRunning: false };

export const TASK_DEFINITION_STUB: TaskDefinition = {
  inputs: [],
  outputs: [],
  dependsOn: [],
  cache: true,
  persistent: false,
  env: []
};

export const TASK_CARD_STUB: TaskCard = {
  taskId: 'web#build',
  name: 'build',
  command: 'tsc',
  description: null,
  dependents: [],
  definition: TASK_DEFINITION_STUB,
  cacheStatus: 'MISS',
  run: RUN_VIEW_STUB
};
