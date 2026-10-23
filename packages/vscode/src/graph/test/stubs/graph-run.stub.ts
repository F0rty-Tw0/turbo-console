import type { RunDefinition, RunRequest } from '../../../run/common/run.type.ts';
import { RUN_REQUEST_STUB } from '../../../run/test/stubs/run.stub.ts';
import { TASK_NODE_STUB } from '../../../tree/test/stubs/workspace-model.stub.ts';

const A_BUILD_TASK = { ...TASK_NODE_STUB, id: 'a#build' };

/** A run of `a#build` under `/ws`, a task `GRAPH_LOADED_STUB` lists. */
export const RUN_A_BUILD_STUB: RunRequest = { ...RUN_REQUEST_STUB, packageName: 'a', task: A_BUILD_TASK };

export const A_BUILD_DEFINITION_STUB: RunDefinition = { root: '/ws', id: 'a#build' };
