import type { TaskNode, WorkspaceModel } from '@turbo-console/core';

/** The task of `taskId` in package `packageName` of the model as it is now; `undefined` once either is gone. */
export const currentTaskOf = (model: WorkspaceModel, packageName: string, taskId: string): TaskNode | undefined => {
  const pkg = model.packages.find((candidate) => candidate.name === packageName);

  return pkg?.tasks.find((task) => task.id === taskId);
};
