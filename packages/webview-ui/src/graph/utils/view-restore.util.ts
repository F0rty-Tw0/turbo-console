import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { RestorePlan } from '../common/restore-plan.type.ts';

/** The saved camera only for the same hash, else a fit. */
export const restorePlanOf = (saved: GraphViewState | null, hash: string): RestorePlan => {
  if (saved?.hash !== hash) {
    const fit: RestorePlan = { kind: 'fit' };

    return fit;
  }

  const restore: RestorePlan = { kind: 'restore', zoom: saved.zoom, pan: saved.pan };

  return restore;
};
