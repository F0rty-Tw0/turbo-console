import type { Position } from '../../bridge/common/graph-state.type.ts';

type RestoreView = {
  readonly kind: 'restore';
  readonly zoom: number;
  readonly pan: Position;
};

type FitView = {
  readonly kind: 'fit';
};

/** How a freshly placed graph gets its camera: the saved one (same hash) or a fit. */
export type RestorePlan = RestoreView | FitView;
