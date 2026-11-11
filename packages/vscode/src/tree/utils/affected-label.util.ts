import { AFFECTED_LABELS } from '../common/affected-label.const.ts';
import { AFFECTED_LEVELS } from '../common/affected.const.ts';
import type { AffectedMode, SharedAffected } from '../common/affected.type.ts';

type Reads = Pick<SharedAffected, 'view' | 'status'>;

/** The tree view description (spec §3 Mode label): the first matching row wins, absent roots are ignored, a loading root with an earlier result counts as having it. */
export const affectedLabelOf = (shown: boolean, roots: string[], affected: Reads): string => {
  const live = roots.filter((root) => affected.status(root) !== 'absent');
  const isFailed = live.some((root) => affected.status(root) === 'failed');
  const isChecking = live.some((root) => affected.status(root) === 'loading' && affected.view(root) === null);
  const modes = new Set<AffectedMode>();

  for (const root of live) {
    const view = affected.view(root);

    if (view !== null) modes.add(view.mode);
  }

  if (!shown || live.length === 0) return '';

  if (isFailed) return AFFECTED_LABELS.unavailable;

  if (isChecking) return AFFECTED_LABELS.checking;

  const [mode] = modes;

  if (mode === undefined) return '';

  if (modes.size > 1) return AFFECTED_LABELS.mixed;

  return `${AFFECTED_LABELS.prefix}${AFFECTED_LEVELS[mode]}`;
};
