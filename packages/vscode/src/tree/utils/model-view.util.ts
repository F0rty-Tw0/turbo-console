import type { PackageNode, WorkspaceModel } from '@turbo-console/core';

import { folderTree } from './folder-tree.util.ts';
import { packageMapOf } from './package-map.util.ts';
import { isVisibleTask } from './task-rows.util.ts';
import { LABEL_MAX } from '../../shared/common/text.const.ts';
import { cleanText } from '../../shared/utils/clean-text.util.ts';
import type { FolderDir, FolderTree } from '../common/folder-tree.type.ts';
import type { ModelView } from '../common/model-view.type.ts';

const SCOPED_NAME = /^@[^/]+\/(.+)$/u;

export const isShownPackage = (pkg: PackageNode): boolean => pkg.tasks.some(isVisibleTask);

/** The name after `@scope/`, or `null` for a name with no scope (`@a/` and `@x` have none). */
const restOf = (name: string): string | null => {
  const match = SCOPED_NAME.exec(name);

  return match?.[1] ?? null;
};

const countOf = (counts: Map<string, number>, key: string): void => {
  const count = counts.get(key) ?? 0;

  counts.set(key, count + 1);
};

const bareOf = (pkg: PackageNode): string => restOf(pkg.name) ?? pkg.name;

/** The text a package row reads for `label`: `packageRow` cleans it the same way. */
const rowTextOf = (label: string): string => cleanText(label, LABEL_MAX);

const textCountsOf = (texts: string[]): Map<string, number> => {
  const counts = new Map<string, number>();

  for (const text of texts) countOf(counts, text);

  return counts;
};

/** Every package still reading its rest whose row text another row shares falls back to its full name; true when one did. */
const fellBack = (shown: PackageNode[], labels: string[], texts: string[]): boolean => {
  const counts = textCountsOf(texts);
  let isAnyFallen = false;

  for (const [index, pkg] of shown.entries()) {
    const text = texts[index] ?? '';
    const count = counts.get(text) ?? 0;
    const isShared = count > 1;
    const isBare = labels[index] !== pkg.name;

    if (!isShared || !isBare) continue;

    labels[index] = pkg.name;
    texts[index] = rowTextOf(pkg.name);
    isAnyFallen = true;
  }

  return isAnyFallen;
};

/**
 * Spec §4.8: a scoped name reads its rest, unless the text its row reads (cleaned) is the text of another shown
 * package's row; then it keeps its full name. A fallback can make a new pair (`@a/x` back to full meets `@b/@a/x`
 * reading `@a/x`), so passes repeat until none falls back: no two rows of a root read the same text, unless their full
 * names already do once cleaned.
 */
const bareLabelsOf = (shown: PackageNode[]): Map<string, string> => {
  const labels = shown.map(bareOf);
  const texts = labels.map(rowTextOf);
  let isFalling = true;

  while (isFalling) isFalling = fellBack(shown, labels, texts);

  const pairs = shown.map((pkg, index): [string, string] => [pkg.name, labels[index] ?? pkg.name]);

  return new Map(pairs);
};

/** The label a package row reads: its full name while scopes are shown, else its bare label. */
export const shownLabelOf = (view: ModelView, pkg: PackageNode, scopeShown: boolean): string => {
  if (scopeShown) return pkg.name;

  return view.bareLabels.get(pkg.name) ?? pkg.name;
};

/** Records the packages of `dir` and every directory below it under each one's path; returns `dir`'s own count. */
const countBelow = (dir: FolderDir, counts: Map<string, number>): number => {
  const nested = dir.dirs.map((child) => countBelow(child, counts));
  const count = nested.reduce((sum, each) => sum + each, dir.packages.length);

  counts.set(dir.path, count);

  return count;
};

/** One walk over the folder tree, so a directory tooltip reads its count instead of walking every package. */
const packagesBelowOf = (folders: FolderTree): Map<string, number> => {
  const counts = new Map<string, number>();

  for (const dir of folders.dirs) countBelow(dir, counts);

  return counts;
};

const visibleCountOf = (pkg: PackageNode): [string, number] => {
  let count = 0;

  for (const task of pkg.tasks) {
    const isVisible = isVisibleTask(task);

    if (isVisible) count += 1;
  }

  return [pkg.name, count];
};

export const modelViewOf = (model: WorkspaceModel): ModelView => {
  const shown = model.packages.filter(isShownPackage);
  const packages = packageMapOf(shown);
  const folders = folderTree(shown);
  const bareLabels = bareLabelsOf(shown);
  const packagesBelow = packagesBelowOf(folders);
  const counts = shown.map(visibleCountOf);
  const visibleTaskCounts = new Map(counts);
  const view: ModelView = { packages, folders, bareLabels, packagesBelow, visibleTaskCounts };

  return view;
};
