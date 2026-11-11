import type { TaskNode } from '@turbo-console/core';

import { AFFECTED_DEPENDENCY_REASONS, AFFECTED_FILE_REASONS } from '../common/affected.const.ts';
import type { AffectedMark } from '../common/affected.type.ts';

const isAtomCarrier = (task: TaskNode): boolean => task.kind === 'atom-umbrella' || task.kind === 'atom-aggregate';

/** The mark of a kept task: umbrella and aggregate first, then file reasons, then `TaskAllChanged` by its package siblings. */
export const affectedMarkOf = (task: TaskNode, reason: string, hasFileSibling: boolean): AffectedMark => {
  const carrier = isAtomCarrier(task);
  const isFileReason = AFFECTED_FILE_REASONS.has(reason);
  const isDependencyReason = AFFECTED_DEPENDENCY_REASONS.has(reason);
  const siblingMark: AffectedMark = hasFileSibling ? 'changed' : 'dependency';

  if (carrier) return 'dependency';

  if (isFileReason) return 'changed';

  if (reason === 'TaskAllChanged') return siblingMark;

  return isDependencyReason ? 'dependency' : 'changed';
};
