import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { DrawnBendsSource } from '../common/flow.type.ts';
import { ROUTED_CLASS } from '../common/graph-layout.const.ts';

/** The bends of the path `edge` is drawn on: its segment points when it is routed, else its control points; `[]` for a straight edge. */
export const drawnBendsOf = (edge: DrawnBendsSource): Position[] => {
  const isRouted = edge.hasClass(ROUTED_CLASS);

  if (isRouted) return edge.segmentPoints() ?? [];

  return edge.controlPoints() ?? [];
};
