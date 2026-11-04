import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { RestorePlan } from '../common/restore-plan.type.ts';

/** No save for this hash opens; a fitted same-hash save fits the container it lands in; a moved one restores its camera. */
export const restorePlanOf = (saved: GraphViewState | null, hash: string): RestorePlan => {
  if (saved?.hash !== hash) {
    const open: RestorePlan = { kind: 'open' };

    return open;
  }

  if (saved.fitted) {
    const fit: RestorePlan = { kind: 'fit' };

    return fit;
  }

  const restore: RestorePlan = { kind: 'restore', zoom: saved.zoom, pan: saved.pan };

  return restore;
};
