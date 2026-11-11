import { AFFECTED_LABELS } from '../common/affected-label.const.ts';
import { AFFECTED_LEVELS } from '../common/affected.const.ts';
import type { AffectedMode, SharedAffected } from '../common/affected.type.ts';

type Reads = Pick<SharedAffected, 'view' | 'status'>;

/** The tree view description (spec §3 Mode label): the first matching row wins, absent roots are ignored, a loading root with an earlier result counts as having it. */
export const affectedLabelOf = (shown: boolean, roots: string[], affected: Reads): string => {
  if (!shown) return '';

  const isLive = (root: string): boolean => affected.status(root) !== 'absent';
  const isFailedRoot = (root: string): boolean => affected.status(root) === 'failed';
  const isCheckingRoot = (root: string): boolean => {
    const isLoading = affected.status(root) === 'loading';

    return isLoading && affected.view(root) === null;
  };
  const live = roots.filter(isLive);

  if (live.length === 0) return '';

  const isFailed = live.some(isFailedRoot);

  if (isFailed) return AFFECTED_LABELS.unavailable;

  const isChecking = live.some(isCheckingRoot);

  if (isChecking) return AFFECTED_LABELS.checking;

  const modes = new Set<AffectedMode>();

  for (const root of live) {
    const view = affected.view(root);

    if (view !== null) modes.add(view.mode);
  }

  const [mode] = modes;

  if (mode === undefined) return '';

  if (modes.size > 1) return AFFECTED_LABELS.mixed;

  return `${AFFECTED_LABELS.prefix}${AFFECTED_LEVELS[mode]}`;
};
