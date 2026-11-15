import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { DrawnBendsSource } from '../common/flow.type.ts';

/** The bends of the path `edge` is drawn on: its control points; `[]` for a straight edge. */
export const drawnBendsOf = (edge: DrawnBendsSource): Position[] => edge.controlPoints() ?? [];
