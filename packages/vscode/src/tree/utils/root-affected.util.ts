import { AFFECTED_LEVELS } from '../common/affected.const.ts';
import type { SharedAffected } from '../common/affected.type.ts';

/**
 * The last tooltip line of a root row: the level of its result (an earlier result counts while a new query loads), or
 * `unavailable` after a failed query with no result. `null` while the toggle is off, nothing is asked or the first query loads.
 */
export const rootAffectedLineOf = (affected: Pick<SharedAffected, 'view' | 'status'>, root: string): string | null => {
  const view = affected.view(root);

  if (view !== null) return `Affected: ${AFFECTED_LEVELS[view.mode]}`;

  const status = affected.status(root);

  if (status === 'failed') return 'Affected: unavailable';

  return null;
};
