import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';

import type { RootState } from '../../roots/common/coordinator.type.ts';
import { DESCRIPTION_MAX, LABEL_MAX } from '../../shared/common/text.const.ts';
import { cleanText } from '../../shared/utils/clean-text.util.ts';
import { isVisibleTask } from '../../tree/utils/task-rows.util.ts';
import type { PickItem } from '../common/picker.type.ts';

/**
 * Quick pick text renders `$(<codicon>)` as an icon, so a repo name such as `$(pass) build` would show a fake status icon;
 * `\$(` renders literally.
 */
const codiconSafe = (text: string): string => text.replaceAll('$(', '\\$(');

const labelOf = (text: string): string => codiconSafe(cleanText(text, LABEL_MAX));

const descriptionOf = (text: string): string => codiconSafe(cleanText(text, DESCRIPTION_MAX));

const compareText = (left: string, right: string): number => {
  if (left < right) return -1;

  return left > right ? 1 : 0;
};

const itemOf = (root: string, label: string, description: string, value: string): PickItem => {
  const item: PickItem = { label: labelOf(label), description: descriptionOf(description), root, value };

  return item;
};

const hasModel = (state: RootState): boolean => state.model !== null;

/** A binary error replaces everything (spec §4.4), a shown model included: such a root offers nothing to run. */
const isRunnable = (state: RootState): boolean => hasModel(state) && state.error?.stage !== 'binary';

const visibleTasksOf = (pkg: PackageNode): TaskNode[] => pkg.tasks.filter(isVisibleTask);

const taskNamesOf = (model: WorkspaceModel): string[] => {
  const names = model.packages.flatMap((pkg) => visibleTasksOf(pkg).map((task) => task.name));
  const unique = new Set(names);

  const listed = [...unique];

  return listed.sort(compareText);
};

const hasTaskNamed = (pkg: PackageNode, taskName: string): boolean => visibleTasksOf(pkg).some((task) => task.name === taskName);

const namesOfRoot = (state: RootState, folderName: string): PickItem[] => {
  if (state.model === null) return [];

  const names = taskNamesOf(state.model);

  return names.map((name) => itemOf(state.folder.root, name, folderName, name));
};

/**
 * Spec §4.6.1: one item per (root, visible task name), each root's names sorted. The description names the root folder
 * only when 2+ roots have a model; a root with a binary error or no model adds none.
 */
export const taskNameItems = (states: RootState[]): PickItem[] => {
  const isMultiRoot = states.filter(hasModel).length >= 2;
  const runnable = states.filter(isRunnable);

  return runnable.flatMap((state) => namesOfRoot(state, isMultiRoot ? state.folder.name : ''));
};

/** The packages of `state` that have a visible task named `taskName`, sorted by name; the description is the path. */
export const packageItems = (state: RootState, taskName: string): PickItem[] => {
  const packages = state.model?.packages ?? [];
  const holding = packages.filter((pkg) => hasTaskNamed(pkg, taskName));
  const sorted = holding.toSorted((left, right) => compareText(left.name, right.name));

  return sorted.map((pkg) => itemOf(state.folder.root, pkg.name, pkg.path, pkg.name));
};

/** The visible tasks of one package, sorted by name. */
export const taskItemsOf = (root: string, pkg: PackageNode): PickItem[] => {
  const sorted = visibleTasksOf(pkg).toSorted((left, right) => compareText(left.name, right.name));

  return sorted.map((task) => itemOf(root, task.name, '', task.name));
};

/** One item per root, the folder name labelled and the path as description; `value` is the root key. */
export const rootItems = (states: RootState[]): PickItem[] =>
  states.map((state) => itemOf(state.folder.root, state.folder.name, state.folder.root, state.folder.root));
