import type { PackageNode, RunLogEvent, RunTasksMatch, TaskNode, TaskOutcome, WorkspaceModel } from '@turbo-console/core';

import { RUN_REQUEST_STUB } from './run.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../../../tree/test/stubs/workspace-model.stub.ts';
import type { ProgressOwner } from '../../common/run-progress.type.ts';
import type { RunDefinition, RunEvent, RunRequest } from '../../common/run.type.ts';

const BUILD_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'a#build' };

export const JOIN_REQUEST_STUB: RunRequest = { ...RUN_REQUEST_STUB, task: BUILD_TASK };

export const JOIN_DEFINITION_STUB: RunDefinition = { root: '/ws', id: 'a#build' };

/** A task event of the run of a#build launched at 1000. */
export const JOIN_EVENT_STUB: RunEvent = { definition: JOIN_DEFINITION_STUB, launchedAt: 1000 };

export const JOIN_OWNER_STUB: ProgressOwner = { root: '/ws', taskId: 'a#build', launchedAt: 1000 };

export const JOIN_RERUN_STUB: ProgressOwner = { ...JOIN_OWNER_STUB, launchedAt: 5000 };

export const JOIN_DEPENDENCIES_STUB: ReadonlyMap<string, string[]> = new Map([['a#build', ['b#build']]]);

export const SEEN_B_STUB: RunLogEvent = { kind: 'seen', taskId: 'b#build' };

const B_OUTCOMES: TaskOutcome[] = [{ taskId: 'b#build', state: 'passed' }];

export const B_PASSED_STUB: RunTasksMatch = { match: null, outcomes: B_OUTCOMES };

const B_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'b#build' };

const LINT_TASK: TaskNode = { ...TASK_NODE_STUB, id: '//#lint' };

const A_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, name: 'a', tasks: [BUILD_TASK] };

const B_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, name: 'b', tasks: [B_TASK] };

const ROOT_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, name: '//', path: '', tasks: [LINT_TASK] };

/** The model of `/ws` with a#build, b#build and the root task //#lint. */
export const JOIN_MODEL_STUB: WorkspaceModel = {
  ...WORKSPACE_MODEL_STUB,
  packages: [ROOT_PACKAGE, A_PACKAGE, B_PACKAGE]
};

/** `JOIN_MODEL_STUB` after b#build is gone. */
export const JOIN_MODEL_NO_B_STUB: WorkspaceModel = { ...JOIN_MODEL_STUB, packages: [ROOT_PACKAGE, A_PACKAGE] };
