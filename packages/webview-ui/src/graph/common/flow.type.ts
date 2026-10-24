import type { Position } from '../../bridge/common/graph-state.type.ts';

/** One edge's geometry in model coordinates; `controlPoints` is empty for a lone edge. */
export type FlowEdgeGeometry = {
  readonly source: Position;
  readonly target: Position;
  readonly controlPoints: Position[];
};

/** One drawn piece of an edge in rendered coordinates; a `null` control is a straight line, else a quadratic curve. */
export type FlowSegment = {
  readonly from: Position;
  readonly control: Position | null;
  readonly to: Position;
};
