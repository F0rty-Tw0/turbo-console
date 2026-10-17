import type { TaskNode, WorkspaceModel } from '@turbo-console/core';

/** The node of `taskId` in package `packageName` of `model`; `undefined` once the model, the package or the task is gone. */
export const currentTaskOf = (model: WorkspaceModel | null, packageName: string, taskId: string): TaskNode | undefined => {
  const pkg = model?.packages.find((candidate) => candidate.name === packageName);

  return pkg?.tasks.find((candidate) => candidate.id === taskId);
};
