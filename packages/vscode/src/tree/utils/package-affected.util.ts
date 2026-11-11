import type { PackageNode } from '@turbo-console/core';

import { clockOf } from './clock-text.util.ts';
import { AFFECTED_LEVELS, AFFECTED_WORDS } from '../common/affected.const.ts';
import type { AffectedEntry, AffectedView } from '../common/affected.type.ts';
import type { RowAffected } from '../common/row-affected.type.ts';

const isChanged = (entry: AffectedEntry): boolean => entry.mark === 'changed';

/**
 * What a package row says: how many of its `taskCount` shown tasks the view marks. The word is `affected` when any of them
 * changed itself, else `affected via dependency`; no marked task, or no view, gives `null`.
 */
export const packageAffectedOf = (pkg: PackageNode, taskCount: number, view: AffectedView | null): RowAffected | null => {
  if (view === null) return null;

  const entries = pkg.tasks.flatMap((task) => view.tasks.get(task.id) ?? []);

  if (entries.length === 0) return null;

  const mark = entries.some(isChanged) ? 'changed' : 'dependency';
  const level = AFFECTED_LEVELS[view.mode];
  const line = `Affected (${level}): ${entries.length} of ${taskCount} tasks (as of ${clockOf(view.settledAt)})`;
  const affected: RowAffected = { word: AFFECTED_WORDS[mark], line };

  return affected;
};
