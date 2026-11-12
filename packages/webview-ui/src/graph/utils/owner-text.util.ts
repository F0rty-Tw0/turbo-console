import { labelIn } from './package-label.util.ts';
import { ROOT_TASKS_TITLE, ROOT_TASK_PACKAGE } from '../common/graph-task.const.ts';

/**
 * The text a reader sees for a task's package: the root label of a single-package root, else the package label in
 * `labels` (the package name when it has none), but "Workspace root (//)" for a monorepo root `//` that `labels` lacks.
 */
export const ownerTextOf = (packageName: string, rootLabel: string | null, labels: ReadonlyMap<string, string>): string => {
  if (rootLabel !== null) return rootLabel;

  if (packageName === ROOT_TASK_PACKAGE) return labels.get(ROOT_TASK_PACKAGE) ?? ROOT_TASKS_TITLE;

  return labelIn(labels, packageName);
};
