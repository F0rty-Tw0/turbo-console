import type { DryRunState, PackageNode, TaskDefinition, TaskNode, WorkspaceModel } from '@turbo-console/core';

import type { RootState } from '../../../roots/common/coordinator.type.ts';
import type { LoadedModel } from '../../../roots/common/root.type.ts';
import { LOADED_MODEL_STUB } from '../../../roots/test/stubs/root.stub.ts';
import { ROOT_STATE_STUB } from '../../../tree/test/stubs/root-state.stub.ts';
import { TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../../../tree/test/stubs/workspace-model.stub.ts';
import type { DetailsInput, DryRunResult, PanelKey } from '../../common/details.type.ts';

export const BUILD_TASK_STUB: TaskNode = {
  ...TASK_NODE_STUB,
  id: 'a#build',
  name: 'build',
  command: 'tsc',
  description: 'Compile the package'
};

export const TEST_TASK_STUB: TaskNode = {
  ...TASK_NODE_STUB,
  id: 'a#test',
  name: 'test',
  command: 'vitest run',
  dependencies: ['a#build']
};

/** An umbrella: it has no script of its own and runs its dependencies. */
export const CHECK_TASK_STUB: TaskNode = {
  ...TASK_NODE_STUB,
  id: 'a#check',
  name: 'check',
  command: null,
  dependencies: ['a#test'],
  kind: 'atom-umbrella'
};

/** An Atomizer file task: the model keeps it, the details page does not show it. */
export const FILE_TASK_STUB: TaskNode = {
  ...TASK_NODE_STUB,
  id: 'a#test:src/x.spec.ts',
  name: 'test:src/x.spec.ts',
  command: 'vitest run src/x.spec.ts',
  dependencies: ['a#build'],
  kind: 'atom-file'
};

export const WEB_BUILD_TASK_STUB: TaskNode = {
  ...TASK_NODE_STUB,
  id: 'web#build',
  name: 'build',
  command: 'vite build',
  dependencies: ['a#build']
};

export const A_PACKAGE_STUB: PackageNode = {
  name: 'a',
  path: 'packages/a',
  tags: ['lib'],
  tasks: [TEST_TASK_STUB, CHECK_TASK_STUB, FILE_TASK_STUB, BUILD_TASK_STUB]
};

export const WEB_PACKAGE_STUB: PackageNode = {
  name: 'web',
  path: 'apps/web',
  tags: [],
  tasks: [WEB_BUILD_TASK_STUB]
};

export const DETAILS_MODEL_STUB: WorkspaceModel = {
  ...WORKSPACE_MODEL_STUB,
  packages: [A_PACKAGE_STUB, WEB_PACKAGE_STUB]
};

export const DETAILS_ROOT_STATE_STUB: RootState = { ...ROOT_STATE_STUB, model: DETAILS_MODEL_STUB };

export const DETAILS_LOADED_STUB: LoadedModel = { ...LOADED_MODEL_STUB, model: DETAILS_MODEL_STUB };

export const PANEL_KEY_STUB: PanelKey = { root: '/ws', packageName: 'a' };

export const TASK_DEFINITION_STUB: TaskDefinition = {
  inputs: ['src/**'],
  outputs: ['dist/**'],
  dependsOn: ['^build'],
  cache: true,
  persistent: false,
  env: ['NODE_ENV']
};

export const DRY_RUN_STATE_STUB: DryRunState = {
  id: 'a#build',
  hash: 'abc123',
  cache: 'HIT',
  definition: TASK_DEFINITION_STUB
};

const DRY_RUN_RESULT_STUB: DryRunResult = { phase: 'ready', states: [DRY_RUN_STATE_STUB] };

export const DETAILS_INPUT_STUB: DetailsInput = {
  root: '/ws',
  packageName: 'a',
  state: DETAILS_ROOT_STATE_STUB,
  dryRun: DRY_RUN_RESULT_STUB,
  runs: () => undefined
};
