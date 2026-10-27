import { segmentsOf } from './folder-tree.util.ts';
import type { FolderDir } from '../common/folder-tree.type.ts';
import type { ModelView } from '../common/model-view.type.ts';
import type { RowContext } from '../common/tree-node.type.ts';
import type { RowInputs, RunningCounts } from '../common/tree-row.type.ts';

/** UB5a §3.3: ` · N running` after the description, `N running` alone when it is empty, and nothing at 0. */
export const withRunningSuffix = (description: string, count: number): string => {
  if (count === 0) return description;

  const suffix = `${count} running`;
  const appended = `${description} · ${suffix}`;

  return description === '' ? suffix : appended;
};

/** The running runs of `root` per package name; a run whose package left the model counts under its name all the same. */
const packageCountsOf = (root: string, context: RowContext): Map<string, number> => {
  const counts = new Map<string, number>();

  for (const taskId of context.live(root)) {
    const entry = context.runs(root, taskId);

    if (entry === undefined) continue;

    const count = counts.get(entry.packageName) ?? 0;

    counts.set(entry.packageName, count + 1);
  }

  return counts;
};

/** Records the running count of `dir` and of every folder below it; returns `dir`'s own. */
const countDir = (dir: FolderDir, packages: ReadonlyMap<string, number>, dirs: Map<string, number>): number => {
  const nested = dir.dirs.map((child) => countDir(child, packages, dirs));
  const own = dir.packages.map((name) => packages.get(name) ?? 0);
  const counts = [...nested, ...own];
  const count = counts.reduce((sum, each) => sum + each, 0);

  if (count > 0) dirs.set(dir.path, count);

  return count;
};

/**
 * UB5a §3.3: the running runs of `root` per package and per folder of `view`. Folders count by tree membership, never by
 * path prefix, so folder `a` never counts `ab/x`. Reads `context.live`, not the view's live ids: runs count with scripts shown too.
 */
export const runningCountsOf = (root: string, view: ModelView, context: RowContext): RunningCounts => {
  const packages = packageCountsOf(root, context);
  const dirs = new Map<string, number>();

  for (const dir of view.folders.dirs) countDir(dir, packages, dirs);

  const counts: RunningCounts = { packages, dirs };

  return counts;
};

export const rowInputsOf = (root: string, view: ModelView, context: RowContext): RowInputs => {
  const running = runningCountsOf(root, view, context);
  const inputs: RowInputs = { scopeShown: context.scopeShown, running };

  return inputs;
};

/** The posix paths of the folders above a package at `path`, outermost first: `packages/apps/web` → `packages`, `packages/apps`. */
export const parentDirsOf = (path: string): string[] => {
  const segments = segmentsOf(path);
  const dirs: string[] = [];

  for (let end = 1; end < segments.length; end += 1) {
    const parts = segments.slice(0, end);

    dirs.push(parts.join('/'));
  }

  return dirs;
};
