import type { TaskNode } from '@turbo-console/core';

import type { RunEntry } from '../../run/common/run.type.ts';
import { AFFECTED_WORDS } from '../common/affected.const.ts';
import type { AffectedView } from '../common/affected.type.ts';
import type { RowAffected } from '../common/row-affected.type.ts';

/**
 * What a task row says about the affected query. A live run (a continuous task's run too) owns the description, so its word
 * is `null` and only the tooltip line is added; an ended run and an idle task keep the word.
 */
export const rowAffectedOf = (task: TaskNode, entry: RunEntry | undefined, view: AffectedView | null): RowAffected | null => {
  const found = view?.tasks.get(task.id);

  if (found === undefined) return null;

  const isLive = entry?.state === 'running';
  const word = isLive ? null : AFFECTED_WORDS[found.mark];
  const affected: RowAffected = { word, line: found.line };

  return affected;
};
