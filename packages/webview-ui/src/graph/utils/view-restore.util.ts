import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { RestorePlan } from '../common/restore-plan.type.ts';

/** The saved camera only for the same hash; the saved selection whenever its package is still in `packages`. */
export const restorePlanOf = (saved: GraphViewState | null, hash: string, packages: string[]): RestorePlan => {
  if (saved === null) {
    const fresh: RestorePlan = { kind: 'fit', selected: null };

    return fresh;
  }

  const isSaved = (name: string): boolean => name === saved.selected;
  const isKept = packages.some(isSaved);
  const selected = isKept ? saved.selected : null;

  if (saved.hash !== hash) {
    const refit: RestorePlan = { kind: 'fit', selected };

    return refit;
  }

  const restore: RestorePlan = { kind: 'restore', zoom: saved.zoom, pan: saved.pan, selected };

  return restore;
};
