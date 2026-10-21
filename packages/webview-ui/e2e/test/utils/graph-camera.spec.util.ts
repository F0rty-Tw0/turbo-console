import type { Position } from '../../../src/bridge/common/graph-state.type.ts';

const ZOOM_TOLERANCE = 0.01;

const PAN_TOLERANCE_PX = 1;

/** `zoom` is within a relative tolerance of `expected`. */
export const isZoomNear = (zoom: number, expected: number): boolean => Math.abs(zoom - expected) / expected <= ZOOM_TOLERANCE;

/** `pan` is within a pixel of `expected` on both axes; no pan is never near. */
export const isPanNear = (pan: Position | null, expected: Position): boolean => {
  if (pan === null) return false;

  const dx = Math.abs(pan.x - expected.x);
  const dy = Math.abs(pan.y - expected.y);

  return dx <= PAN_TOLERANCE_PX && dy <= PAN_TOLERANCE_PX;
};
