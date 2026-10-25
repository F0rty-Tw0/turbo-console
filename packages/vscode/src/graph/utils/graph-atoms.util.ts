import { atomGroupsOf } from '@turbo-console/core';
import type { AtomGroup, PackageNode, WorkspaceModel } from '@turbo-console/core';

import { isHiddenAggregate } from '../../tree/utils/task-rows.util.ts';
import type { AtomFold } from '../common/graph-atom.type.ts';

type GroupFold = {
  readonly umbrellaId: string;
  readonly hiddenIds: string[];
  readonly mappedIds: string[];
  readonly dependencies: string[];
};

const NO_IDS: string[] = [];

const foldOfGroup = (pkg: PackageNode | undefined, group: AtomGroup): GroupFold => {
  const tasks = pkg?.tasks ?? [];
  const aggregate = tasks.find((task) => isHiddenAggregate(task, [group]));
  const aggregateIds = [aggregate?.id];
  const hiddenIds = aggregateIds.filter((id) => id !== undefined);
  const aggregateDependencies = aggregate?.dependencies ?? NO_IDS;
  const fileTasks = group.files.map((file) => file.task);
  const fileIds = fileTasks.map((task) => task.id);
  const fileDependencies = fileTasks.flatMap((task) => task.dependencies);
  const mappedIds = [...hiddenIds, ...fileIds];
  const dependencies = [...aggregateDependencies, ...fileDependencies];
  const fold: GroupFold = { umbrellaId: group.umbrella.id, hiddenIds, mappedIds, dependencies };

  return fold;
};

const groupFoldOf = (model: WorkspaceModel, group: AtomGroup): GroupFold => {
  const pkg = model.packages.find((candidate) => candidate.name === group.packageName);

  return foldOfGroup(pkg, group);
};

/** Where each hidden aggregate and file task folds to: the umbrella of its group, which takes over their dependencies. */
export const atomFoldOf = (model: WorkspaceModel): AtomFold => {
  const groups = atomGroupsOf(model);
  const folds = groups.map((group) => groupFoldOf(model, group));
  const pairs = folds.flatMap(({ umbrellaId, mappedIds }) => mappedIds.map((id): [string, string] => [id, umbrellaId]));
  const hidden = new Set(folds.flatMap((fold) => fold.hiddenIds));
  const foldedPairs = folds.map((fold): [string, string[]] => [fold.umbrellaId, fold.dependencies]);
  const atomFold: AtomFold = { groups, umbrellaOf: new Map(pairs), hidden, foldedOf: new Map(foldedPairs) };

  return atomFold;
};
