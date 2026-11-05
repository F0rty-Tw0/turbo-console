import type { RunLogEvent, RunTasksMatch, TaskNode, TaskOutcome } from '@turbo-console/core';

import { RUN_REQUEST_STUB } from './run.stub.ts';
import { TASK_NODE_STUB } from '../../../tree/test/stubs/workspace-model.stub.ts';
import type { ProgressOwner } from '../../common/run-progress.type.ts';
import type { RunDefinition, RunRequest } from '../../common/run.type.ts';

const BUILD_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'a#build' };

export const JOIN_REQUEST_STUB: RunRequest = { ...RUN_REQUEST_STUB, task: BUILD_TASK };

export const JOIN_DEFINITION_STUB: RunDefinition = { root: '/ws', id: 'a#build' };

export const JOIN_OWNER_STUB: ProgressOwner = { root: '/ws', taskId: 'a#build', launchedAt: 1000 };

export const JOIN_RERUN_STUB: ProgressOwner = { ...JOIN_OWNER_STUB, launchedAt: 5000 };

export const JOIN_DEPENDENCIES_STUB: ReadonlyMap<string, string[]> = new Map([['a#build', ['b#build']]]);

export const SEEN_B_STUB: RunLogEvent = { kind: 'seen', taskId: 'b#build' };

const B_OUTCOMES: TaskOutcome[] = [{ taskId: 'b#build', state: 'passed' }];

export const B_PASSED_STUB: RunTasksMatch = { match: null, outcomes: B_OUTCOMES };
