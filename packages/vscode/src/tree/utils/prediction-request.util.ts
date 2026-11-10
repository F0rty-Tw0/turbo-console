import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';

import { isVisibleTask } from './task-filter.util.ts';
import type { PredictionBatch } from '../common/prediction.type.ts';

type PackageTasks = { readonly name: string; readonly tasks: TaskNode[] };

const isRequestedTask = (task: TaskNode): boolean => {
  const isRunnable = isVisibleTask(task) && task.command !== null;

  return isRunnable && task.isTurboTask && !task.persistent;
};

const packageTasksOf = (pkg: PackageNode): PackageTasks => {
  const tasks = pkg.tasks.filter(isRequestedTask);
  const packageTasks: PackageTasks = { name: pkg.name, tasks };

  return packageTasks;
};

const hasTasks = (entry: PackageTasks): boolean => entry.tasks.length > 0;

const idPairsOf = (entry: PackageTasks): [string, string][] => entry.tasks.map((task): [string, string] => [task.id, entry.name]);

const taskNamesOf = (entry: PackageTasks): string[] => entry.tasks.map((task) => task.name);

/** The dry run to ask for `packageNames` and the task ids it covers; `null` when no named package has a task worth predicting. */
export const predictionBatchOf = (model: WorkspaceModel, packageNames: string[]): PredictionBatch | null => {
  const packagesNamed = (name: string): PackageNode[] => {
    const isNamed = (pkg: PackageNode): boolean => pkg.name === name;

    return model.packages.filter(isNamed);
  };
  const named = packageNames.flatMap(packagesNamed);
  const found = named.map(packageTasksOf).filter(hasTasks);
  const pairs = found.flatMap(idPairsOf);

  if (pairs.length === 0) return null;

  const names = new Set(found.flatMap(taskNamesOf));
  const unsortedNames = [...names];
  const sortedNames = unsortedNames.sort();
  const packageSet = new Set(found.map((entry) => entry.name));
  const packages = [...packageSet];
  const request = { tasks: sortedNames, packages, singlePackage: model.singlePackage };
  const batch: PredictionBatch = { request, requested: new Map(pairs) };

  return batch;
};
