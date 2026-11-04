import type { Position } from '../../bridge/common/graph-state.type.ts';

type RestoreView = {
  readonly kind: 'restore';
  readonly zoom: number;
  readonly pan: Position;
};

type FitView = {
  readonly kind: 'fit';
};

type OpenView = {
  readonly kind: 'open';
};

/** How a freshly placed graph gets its camera: the saved one (same hash and moved), a fit (a fitted same-hash save), or an open (no save for this hash). */
export type RestorePlan = RestoreView | FitView | OpenView;
