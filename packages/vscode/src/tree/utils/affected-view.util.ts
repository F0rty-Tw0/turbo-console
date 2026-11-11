import type { AffectedResult, TaskNode, WorkspaceModel } from '@turbo-console/core';

import { affectedMarkOf } from './affected-mark.util.ts';
import { affectedWhyOf } from './affected-why.util.ts';
import { clockOf } from './clock-text.util.ts';
import { AFFECTED_FILE_REASONS, AFFECTED_LEVELS } from '../common/affected.const.ts';
import type { AffectedEntry, AffectedView } from '../common/affected.type.ts';

type AffectedRow = AffectedResult['tasks'][number];

type Kept = { readonly task: TaskNode; readonly packageName: string };

const isKept = (task: TaskNode): boolean => task.kind !== 'atom-file';

const keptByIdOf = (model: WorkspaceModel): Map<string, Kept> => {
  const kept = new Map<string, Kept>();

  for (const pkg of model.packages) {
    for (const task of pkg.tasks.filter(isKept)) kept.set(task.id, { task, packageName: pkg.name });
  }

  return kept;
};

const fileReasonPackagesOf = (rows: AffectedRow[], keptById: Map<string, Kept>): Set<string> => {
  const packages = new Set<string>();

  for (const { id, reason } of rows) {
    const kept = keptById.get(id);
    const isFileReason = AFFECTED_FILE_REASONS.has(reason);

    if (kept !== undefined && isFileReason) packages.add(kept.packageName);
  }

  return packages;
};

const lineOf = (result: AffectedResult, row: AffectedRow, settledAt: number): string => {
  const level = AFFECTED_LEVELS[result.mode];
  const why = affectedWhyOf(row.reason, row.detail);

  return `Affected (${level}): ${why} (as of ${clockOf(settledAt)})`;
};

/** The marks and tooltip lines of the rows of `result` that the tree draws, keyed by task id. */
export const affectedViewOf = (result: AffectedResult, model: WorkspaceModel, settledAt: number): AffectedView => {
  const keptById = keptByIdOf(model);
  const fileReasonPackages = fileReasonPackagesOf(result.tasks, keptById);
  const tasks = new Map<string, AffectedEntry>();

  for (const row of result.tasks) {
    const kept = keptById.get(row.id);

    if (kept === undefined) continue;

    const hasFileSibling = fileReasonPackages.has(kept.packageName);
    const mark = affectedMarkOf(kept.task, row.reason, hasFileSibling);
    const line = lineOf(result, row, settledAt);

    tasks.set(row.id, { mark, line });
  }
  const view: AffectedView = { settledAt, mode: result.mode, tasks };

  return view;
};
