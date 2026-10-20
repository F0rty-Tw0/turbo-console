import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';

import { folderTree } from './folder-tree.util.ts';
import { packageMapOf } from './package-map.util.ts';
import { isListedTask, isLiveScript } from './script-task.util.ts';
import { LABEL_MAX } from '../../shared/common/text.const.ts';
import { cleanText } from '../../shared/utils/clean-text.util.ts';
import type { FolderDir, FolderTree } from '../common/folder-tree.type.ts';
import type { ModelView } from '../common/model-view.type.ts';

const SCOPED_NAME = /^@[^/]+\/(.+)$/u;

/** The text a package row and the places beside it show: its label (the single-package root), else its name. */
export const packageTextOf = (pkg: PackageNode): string => pkg.label ?? pkg.name;

/** The path a package shows: `.` for the repo root (path `""`), else the path unchanged. */
export const packagePathTextOf = (path: string): string => (path === '' ? '.' : path);

/** Spec 1c-b §4.1: an offered task, or (scripts hidden) a script whose id is live under the package's folder root. */
export const isShownPackage = (pkg: PackageNode, scriptsShown: boolean, liveOfRoot: ReadonlySet<string>): boolean => {
  const isShownTask = (task: TaskNode): boolean => isListedTask(task, scriptsShown) || isLiveScript(task, liveOfRoot);

  return pkg.tasks.some(isShownTask);
};

/** The name after `@scope/`, or `null` for a name with no scope (`@a/` and `@x` have none). */
const restOf = (name: string): string | null => {
  const match = SCOPED_NAME.exec(name);

  return match?.[1] ?? null;
};

const countOf = (counts: Map<string, number>, key: string): void => {
  const count = counts.get(key) ?? 0;

  counts.set(key, count + 1);
};

/** The text a package row reads for `label`, cleaned once here so `packageRow` does not clean it again. */
const rowTextOf = (label: string): string => cleanText(label, LABEL_MAX);

/** The row text of a scoped name's rest; `null` with no scope, or when the rest would read blank (`@a/` + a zero-width space). */
const restTextOf = (pkg: PackageNode): string | null => {
  const rest = restOf(packageTextOf(pkg));

  if (rest === null) return null;

  const text = rowTextOf(rest);
  const isBlank = text.trim() === '';

  return isBlank ? null : text;
};

const textCountsOf = (texts: string[]): Map<string, number> => {
  const counts = new Map<string, number>();

  for (const text of texts) countOf(counts, text);

  return counts;
};

/** Every package still reading its rest whose row text another row shares falls back to its full shown text; true when one did. */
const fellBack = (shown: PackageNode[], bare: boolean[], texts: string[]): boolean => {
  const counts = textCountsOf(texts);
  let isAnyFallen = false;

  for (const [index, pkg] of shown.entries()) {
    const text = texts[index] ?? '';
    const count = counts.get(text) ?? 0;
    const isShared = count > 1;
    const isBare = bare[index] === true;

    if (!isShared || !isBare) continue;

    bare[index] = false;
    texts[index] = rowTextOf(packageTextOf(pkg));
    isAnyFallen = true;
  }

  return isAnyFallen;
};

/**
 * Spec §4.8: a scoped name reads its rest, unless the text its row reads (cleaned) is the text of another shown
 * package's row; then it keeps its full shown text. A fallback can make a new pair (`@a/x` back to full meets `@b/@a/x`
 * reading `@a/x`), so passes repeat until none falls back: no two rows of a root read the same text, unless their full
 * shown texts already do once cleaned. Maps each package name to the cleaned text its row reads.
 */
const bareTextsOf = (shown: PackageNode[]): Map<string, string> => {
  const restTexts = shown.map(restTextOf);
  const bare = restTexts.map((text) => text !== null);
  const texts = shown.map((pkg, index) => restTexts[index] ?? rowTextOf(packageTextOf(pkg)));
  let isFalling = true;

  while (isFalling) isFalling = fellBack(shown, bare, texts);

  const pairs = shown.map((pkg, index): [string, string] => [pkg.name, texts[index] ?? rowTextOf(packageTextOf(pkg))]);

  return new Map(pairs);
};

/** The cleaned label a package row reads: its full shown text while scopes are shown, else its bare text. */
export const shownTextOf = (view: ModelView, pkg: PackageNode, scopeShown: boolean): string => {
  const bareText = view.bareTexts.get(pkg.name);

  if (scopeShown || bareText === undefined) return rowTextOf(packageTextOf(pkg));

  return bareText;
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

const offeredCountOf = (pkg: PackageNode, scriptsShown: boolean): [string, number] => {
  let count = 0;

  for (const task of pkg.tasks) {
    const isListed = isListedTask(task, scriptsShown);

    if (isListed) count += 1;
  }

  return [pkg.name, count];
};

export const modelViewOf = (model: WorkspaceModel, scriptsShown: boolean, liveOfRoot: ReadonlySet<string>): ModelView => {
  const isShown = (pkg: PackageNode): boolean => isShownPackage(pkg, scriptsShown, liveOfRoot);
  const shown = model.packages.filter(isShown);
  const packages = packageMapOf(shown);
  const folders = folderTree(shown);
  const bareTexts = bareTextsOf(shown);
  const packagesBelow = packagesBelowOf(folders);
  const counts = shown.map((pkg) => offeredCountOf(pkg, scriptsShown));
  const visibleTaskCounts = new Map(counts);
  const view: ModelView = { packages, folders, bareTexts, packagesBelow, visibleTaskCounts };

  return view;
};
