import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';

import type { LoadedModel } from '../../../roots/common/root.type.ts';
import { LOADED_MODEL_STUB } from '../../../roots/test/stubs/root.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../stubs/workspace-model.stub.ts';

/** A package under `packages/<name>` with one `<name>#build` task, so task ids stay unique across packages. */
export const packageNamed = (name: string, command = 'tsc'): PackageNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id: `${name}#build`, command };
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, name, path: `packages/${name}`, tasks: [task] };

  return pkg;
};

/** The script `<name>#lint`, which is no turbo task. */
export const scriptTaskNamed = (name: string): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id: `${name}#lint`, name: 'lint', isTurboTask: false };

  return task;
};

/** A package under `packages/<name>` with one script `<name>#lint` and no turbo task. */
export const scriptPackageNamed = (name: string): PackageNode => {
  const task = scriptTaskNamed(name);
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, name, path: `packages/${name}`, tasks: [task] };

  return pkg;
};

export const loadedWith = (packages: PackageNode[]): LoadedModel => {
  const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages };
  const loaded: LoadedModel = { ...LOADED_MODEL_STUB, model };

  return loaded;
};
