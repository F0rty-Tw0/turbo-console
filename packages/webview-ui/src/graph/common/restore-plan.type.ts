import type { Position } from '../../bridge/common/graph-state.type.ts';

type RestoreView = {
  readonly kind: 'restore';
  readonly zoom: number;
  readonly pan: Position;
  readonly selected: string | null;
};

type FitView = {
  readonly kind: 'fit';
  readonly selected: string | null;
};

/** How a freshly placed graph gets its camera: the saved one (same hash) or a fit; `selected` survives only if still drawn. */
export type RestorePlan = RestoreView | FitView;
