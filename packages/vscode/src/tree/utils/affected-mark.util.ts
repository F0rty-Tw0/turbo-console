import type { TaskNode } from '@turbo-console/core';

import { AFFECTED_DEPENDENCY_REASONS, AFFECTED_FILE_REASONS, AFFECTED_REQUIRED_DETAIL } from '../common/affected.const.ts';
import type { AffectedMark, AffectedPackageFlags } from '../common/affected.type.ts';

const isAtomCarrier = (task: TaskNode): boolean => task.kind === 'atom-umbrella' || task.kind === 'atom-aggregate';

const allChangedMarkOf = (detail: string | null, flags: AffectedPackageFlags): AffectedMark => {
  if (flags.hasFileSibling) return 'changed';

  if (detail === AFFECTED_REQUIRED_DETAIL) return 'dependency';

  return flags.hasAffectedUpstream ? 'dependency' : 'changed';
};

/**
 * The mark of a kept task: umbrella and aggregate first, then file reasons, then `TaskAllChanged` (a file sibling means
 * `changed`; turbo's "required by" text or an affected upstream means `dependency`; else the package itself changed).
 */
export const affectedMarkOf = (task: TaskNode, reason: string, detail: string | null, flags: AffectedPackageFlags): AffectedMark => {
  const carrier = isAtomCarrier(task);
  const isFileReason = AFFECTED_FILE_REASONS.has(reason);
  const isDependencyReason = AFFECTED_DEPENDENCY_REASONS.has(reason);

  if (carrier) return 'dependency';

  if (isFileReason) return 'changed';

  if (reason === 'TaskAllChanged') return allChangedMarkOf(detail, flags);

  return isDependencyReason ? 'dependency' : 'changed';
};
