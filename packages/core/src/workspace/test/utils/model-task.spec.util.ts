import type { TaskNode, WorkspaceModel } from '../../common/workspace-model.type.ts';

/** The task of `model.packages` with this id, the root `//` package's included. */
export const taskOf = (model: WorkspaceModel, id: string): TaskNode | undefined => {
  const tasks = model.packages.flatMap((pkg) => pkg.tasks);

  return tasks.find((task) => task.id === id);
};
