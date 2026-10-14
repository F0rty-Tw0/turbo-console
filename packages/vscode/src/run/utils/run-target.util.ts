import type { TaskNode, WorkspaceModel } from '@turbo-console/core';

import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { RunDefinition, RunRequest, TaskTarget } from '../common/run.type.ts';

const isFields = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === 'object' && value !== null;

/** The task row a run command was invoked on; `null` for any other argument (another row, none from the palette). */
export const taskTargetOf = (value: unknown): TaskTarget | null => {
  if (!isFields(value)) return null;

  const { kind, root, key, packageName } = value;

  if (kind !== 'task') return null;

  const isNamed = typeof root === 'string' && typeof key === 'string';

  if (!isNamed) return null;

  if (typeof packageName !== 'string') return null;

  const definition: RunDefinition = { root, id: key };
  const target: TaskTarget = { definition, packageName };

  return target;
};

/** The task `target` names in the current model of its root; `undefined` while the root has no model or no longer holds it. */
export const modelTaskOf = (target: TaskTarget, state: RootState | undefined): TaskNode | undefined => {
  const pkg = state?.model?.packages.find((node) => node.name === target.packageName);

  return pkg?.tasks.find((node) => node.id === target.definition.id);
};

/** The run of `target` in the current state of its root; `null` while the root has no binary or no longer holds the task. */
export const runRequestOf = (target: TaskTarget, state: RootState | undefined): RunRequest | null => {
  const binary = state?.binary;

  if (binary === null || binary === undefined) return null;

  const task = modelTaskOf(target, state);

  if (task === undefined) return null;

  const request: RunRequest = { root: target.definition.root, packageName: target.packageName, task, binaryPath: binary.path };

  return request;
};

export const taskIdsOf = (model: WorkspaceModel | null): Set<string> => {
  const packages = model?.packages ?? [];
  const ids = packages.flatMap((pkg) => pkg.tasks.map((task) => task.id));

  return new Set(ids);
};
