import type { AtomFile, AtomGroup, PackageNode, TaskNode } from '@turbo-console/core';

import { fileRow, fileRowsOf, umbrellaRow } from './atom-rows.util.ts';
import { groupRowOf } from './script-rows.util.ts';
import { isVisibleTurboTask } from './script-task.util.ts';
import { isVisibleTask } from './task-filter.util.ts';
import { taskRow } from './task-row.util.ts';
import type { RowContext } from '../common/tree-node.type.ts';
import type { RowScope, TreeRow } from '../common/tree-row.type.ts';

const umbrellaGroupOf = (groups: AtomGroup[], taskId: string): AtomGroup | undefined => {
  return groups.find((group) => group.umbrella.id === taskId);
};

const fileOf = (groups: AtomGroup[], taskId: string): AtomFile | undefined => {
  const files = groups.flatMap((group) => group.files);

  return files.find((file) => file.task.id === taskId);
};

/** The aggregate of a group is replaced by its umbrella; one whose group the package does not hold stays a plain task. */
const isHiddenAggregate = (task: TaskNode, groups: AtomGroup[]): boolean => {
  const { atom } = task;

  if (task.kind !== 'atom-aggregate' || atom === null) return false;

  return groups.some((group) => group.umbrella.atom?.group === atom.group);
};

const rowOfTask = (scope: RowScope, pkg: PackageNode, task: TaskNode, context: RowContext): TreeRow => {
  const { groups } = context.atoms(scope.root, pkg.name);
  const group = umbrellaGroupOf(groups, task.id);

  if (group === undefined) return taskRow(scope, pkg, task, context);

  return umbrellaRow(scope, pkg, group, context);
};

/**
 * The visible turbo tasks of a package (`atom-file` tasks stay hidden), each with its last run's state read at the
 * context's wall clock, then its Scripts group when it holds any (scripts are rows of the group, not of the package).
 * A group's umbrella is collapsible and its aggregate is hidden.
 */
export const taskRows = (scope: RowScope, pkg: PackageNode, context: RowContext): TreeRow[] => {
  const { groups } = context.atoms(scope.root, pkg.name);
  const isShown = (task: TaskNode): boolean => {
    const isVisible = isVisibleTurboTask(task);
    const isHidden = isHiddenAggregate(task, groups);

    return isVisible && !isHidden;
  };
  const turbo = pkg.tasks.filter(isShown);
  const rows = turbo.map((task) => rowOfTask(scope, pkg, task, context));
  const group = groupRowOf(scope, pkg, context);

  if (group === null) return rows;

  return [...rows, group];
};

/** The row of the task `taskId` of `pkg`, built alone; a hidden or unknown id has none, a file of a group has its file row. */
export const taskRowOf = (scope: RowScope, pkg: PackageNode, taskId: string, context: RowContext): TreeRow | undefined => {
  const task = pkg.tasks.find((candidate) => candidate.id === taskId);

  if (task === undefined) return undefined;

  const { groups } = context.atoms(scope.root, pkg.name);
  const file = fileOf(groups, taskId);

  if (file !== undefined) return fileRow(scope, pkg, file, context);

  const isAggregate = isHiddenAggregate(task, groups);
  const isVisible = isVisibleTask(task);

  if (isAggregate || !isVisible) return undefined;

  return rowOfTask(scope, pkg, task, context);
};

/** The file rows of `taskId` when it is the umbrella of a group of `pkg`; any other task has no children. */
export const taskChildRows = (scope: RowScope, pkg: PackageNode, taskId: string, context: RowContext): TreeRow[] => {
  const { groups } = context.atoms(scope.root, pkg.name);
  const group = umbrellaGroupOf(groups, taskId);

  if (group === undefined) return [];

  return fileRowsOf(scope, pkg, group, context);
};
