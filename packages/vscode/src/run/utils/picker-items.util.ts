import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';

import type { RootState } from '../../roots/common/coordinator.type.ts';
import { DESCRIPTION_MAX, LABEL_MAX } from '../../shared/common/text.const.ts';
import { cleanText } from '../../shared/utils/clean-text.util.ts';
import { packagePathTextOf, packageTextOf } from '../../tree/utils/model-view.util.ts';
import { byName, isOfferedTask } from '../../tree/utils/task-filter.util.ts';
import type { PickItem, TaskOffer } from '../common/picker.type.ts';

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

const offeredTasksOf = (pkg: PackageNode, scriptsShown: boolean): TaskNode[] =>
  pkg.tasks.filter((task) => isOfferedTask(task, scriptsShown));

const taskNamesOf = (model: WorkspaceModel, scriptsShown: boolean): string[] => {
  const names = model.packages.flatMap((pkg) => offeredTasksOf(pkg, scriptsShown).map((task) => task.name));
  const unique = new Set(names);

  const listed = [...unique];

  return listed.sort(compareText);
};

const hasTaskNamed = (pkg: PackageNode, taskName: string, scriptsShown: boolean): boolean =>
  offeredTasksOf(pkg, scriptsShown).some((task) => task.name === taskName);

const namesOfRoot = (state: RootState, folderName: string, scriptsShown: boolean): PickItem[] => {
  if (state.model === null) return [];

  const names = taskNamesOf(state.model, scriptsShown);

  return names.map((name) => itemOf(state.folder.root, name, folderName, name));
};

/**
 * Spec §4.6.1 and 1c-b §4.8: one item per (root, offered task name), each root's names sorted. A script name lists only
 * while `scriptsShown`. The description names the root folder only when 2+ roots have a model; a root with a binary error
 * or no model adds none.
 */
export const taskNameItems = (states: RootState[], scriptsShown: boolean): PickItem[] => {
  const isMultiRoot = states.filter(hasModel).length >= 2;
  const runnable = states.filter(isRunnable);

  return runnable.flatMap((state) => namesOfRoot(state, isMultiRoot ? state.folder.name : '', scriptsShown));
};

/** The packages of `state` that have an offered task named `taskName`, sorted by name; the item reads the label (else the name), the description is the path (`.` for the root). */
export const packageItems = (state: RootState, taskName: string, scriptsShown: boolean): PickItem[] => {
  const packages = state.model?.packages ?? [];
  const holding = packages.filter((pkg) => hasTaskNamed(pkg, taskName, scriptsShown));
  const sorted = holding.toSorted((left, right) => compareText(left.name, right.name));

  return sorted.map((pkg) => itemOf(state.folder.root, packageTextOf(pkg), packagePathTextOf(pkg.path), pkg.name));
};

/**
 * The offered tasks of one package: turbo tasks first, then the scripts (only while shown, a refused name never), each
 * sorted by name. A script's description is its package manager's run, such as `pnpm run`.
 */
export const taskItemsOf = (root: string, pkg: PackageNode, offer: TaskOffer): PickItem[] => {
  const offered = offeredTasksOf(pkg, offer.scriptsShown);
  const turbo = offered.filter((task) => task.isTurboTask).toSorted(byName);
  const scripts = offered.filter((task) => !task.isTurboTask).toSorted(byName);
  const runCommand = `${offer.packageManager} run`;
  const turboItems = turbo.map((task) => itemOf(root, task.name, '', task.name));
  const scriptItems = scripts.map((task) => itemOf(root, task.name, runCommand, task.name));
  const items = [...turboItems, ...scriptItems];

  return items;
};

/** One item per root, the folder name labelled and the path as description; `value` is the root key. */
export const rootItems = (states: RootState[]): PickItem[] =>
  states.map((state) => itemOf(state.folder.root, state.folder.name, state.folder.root, state.folder.root));
