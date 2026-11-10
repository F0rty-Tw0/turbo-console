import type { DryRunState, PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';

import { dryStateOf } from './atom-load.spec.util.ts';
import { TASK_DEFINITION_STUB } from '../stubs/atom-load.stub.ts';
import { TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../stubs/workspace-model.stub.ts';

/** A turbo task `name` of package `packageName`, with id `<packageName>#<name>`. */
export const turboTaskOf = (packageName: string, name: string, patch: Partial<TaskNode> = {}): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id: `${packageName}#${name}`, name, ...patch };

  return task;
};

const packageOf = (name: string, tasks: TaskNode[]): PackageNode => {
  const pkg: PackageNode = { name, path: `packages/${name}`, label: null, tags: [], tasks };

  return pkg;
};

/** A model holding one package per key, each with the given tasks. */
export const predictionModelOf = (packages: Record<string, TaskNode[]>, singlePackage = false): WorkspaceModel => {
  const nodes = Object.entries(packages).map(([name, tasks]) => packageOf(name, tasks));
  const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, singlePackage, packages: nodes };

  return model;
};

/** A model where each named package has one `build` task. */
export const buildModelOf = (names: string[]): WorkspaceModel => {
  const entries = names.map((name): [string, TaskNode[]] => [name, [turboTaskOf(name, 'build')]]);

  return predictionModelOf(Object.fromEntries(entries));
};

/** A `MISS` state of task `id` whose definition turns cache off. */
export const uncachedStateOf = (id: string): DryRunState => {
  const definition = { ...TASK_DEFINITION_STUB, cache: false };
  const miss = dryStateOf(id, 'MISS');
  const state: DryRunState = { ...miss, definition };

  return state;
};

/** `count` package names, `@fx/p0` up to `@fx/p<count - 1>`. */
export const packageNamesOf = (count: number): string[] => Array.from({ length: count }, (_, index) => `@fx/p${index}`);
