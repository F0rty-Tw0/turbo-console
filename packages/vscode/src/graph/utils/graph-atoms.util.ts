import { atomGroupsOf } from '@turbo-console/core';
import type { AtomGroup, PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';

import { isHiddenAggregate } from '../../tree/utils/task-rows.util.ts';
import type { AtomFold } from '../common/graph-atom.type.ts';

type GroupFold = {
  readonly umbrellaId: string;
  readonly hiddenIds: string[];
  readonly mappedIds: string[];
  readonly dependencies: string[];
};

const NO_IDS: string[] = [];

const aggregateIdsOf = (aggregate: TaskNode | undefined): string[] => {
  if (aggregate === undefined) return NO_IDS;

  const ids = [aggregate.id];

  return ids;
};

const foldOfGroup = (pkg: PackageNode, group: AtomGroup): GroupFold => {
  const aggregate = pkg.tasks.find((task) => isHiddenAggregate(task, [group]));
  const hiddenIds = aggregateIdsOf(aggregate);
  const aggregateDependencies = aggregate?.dependencies ?? NO_IDS;
  const fileTasks = group.files.map((file) => file.task);
  const fileIds = fileTasks.map((task) => task.id);
  const fileDependencies = fileTasks.flatMap((task) => task.dependencies);
  const mappedIds = [...hiddenIds, ...fileIds];
  const dependencies = [...aggregateDependencies, ...fileDependencies];
  const fold: GroupFold = { umbrellaId: group.umbrella.id, hiddenIds, mappedIds, dependencies };

  return fold;
};

const foldsOfPackage = (pkg: PackageNode, groups: AtomGroup[]): GroupFold[] => {
  const ownGroups = groups.filter((group) => group.packageName === pkg.name);

  return ownGroups.map((group) => foldOfGroup(pkg, group));
};

/** Where each hidden aggregate and file task folds to: the umbrella of its group, which takes over their dependencies. */
export const atomFoldOf = (model: WorkspaceModel): AtomFold => {
  const groups = atomGroupsOf(model);
  const folds = model.packages.flatMap((pkg) => foldsOfPackage(pkg, groups));
  const pairs = folds.flatMap(({ umbrellaId, mappedIds }) => mappedIds.map((id): [string, string] => [id, umbrellaId]));
  const hidden = new Set(folds.flatMap((fold) => fold.hiddenIds));
  const foldedPairs = folds.map((fold): [string, string[]] => [fold.umbrellaId, fold.dependencies]);
  const atomFold: AtomFold = { groups, umbrellaOf: new Map(pairs), hidden, foldedOf: new Map(foldedPairs) };

  return atomFold;
};
