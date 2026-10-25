import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';

import { TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../stubs/workspace-model.stub.ts';

const GROUP = 'e2e-ci';

const PACKAGE_NAME = '@fx/e2e';

const ATOM: NonNullable<TaskNode['atom']> = { group: GROUP, isLive: false };

const UMBRELLA_TASK: TaskNode = {
  ...TASK_NODE_STUB,
  id: `${PACKAGE_NAME}#${GROUP}`,
  name: GROUP,
  kind: 'atom-umbrella',
  atom: ATOM
};

const fileTaskOf = (specPath: string): TaskNode => {
  const name = `${GROUP}--${specPath}`;
  const task: TaskNode = { ...TASK_NODE_STUB, id: `${PACKAGE_NAME}#${name}`, name, kind: 'atom-file', atom: ATOM };

  return task;
};

/** A model holding package `@fx/e2e` with the umbrella of group `e2e-ci` and one file task per spec path. */
export const atomModelOf = (specPaths: string[], singlePackage = false): WorkspaceModel => {
  const fileTasks = specPaths.map(fileTaskOf);
  const pkg: PackageNode = {
    name: PACKAGE_NAME,
    path: 'packages/e2e',
    label: null,
    tags: [],
    tasks: [UMBRELLA_TASK, ...fileTasks]
  };
  const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, singlePackage, packages: [pkg] };

  return model;
};
