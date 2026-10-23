import type { Position } from '../../../src/bridge/common/graph-state.type.ts';
import type { DragRecord } from '../../common/graph.type.ts';

const DRAG_TOLERANCE = 2;

/** How far `moved` sits from where the drag should have put the node, per axis, in model units. */
export const dragError = (moved: Position | undefined, drag: DragRecord): Position => {
  const x = Math.abs((moved?.x ?? Number.NaN) - (drag.from.x + drag.dx / drag.zoom));
  const y = Math.abs((moved?.y ?? Number.NaN) - (drag.from.y + drag.dy / drag.zoom));
  const error: Position = { x, y };

  return error;
};

export const isWithinTolerance = (error: Position): boolean => error.x <= DRAG_TOLERANCE && error.y <= DRAG_TOLERANCE;
