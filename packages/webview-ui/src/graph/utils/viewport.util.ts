import type { Viewport } from '../common/graph-page.type.ts';

/** The two cameras have the same zoom and the same pan. */
export const isSameViewport = (first: Viewport, second: Viewport): boolean => {
  const isSameZoom = first.zoom === second.zoom;
  const isSamePan = first.pan.x === second.pan.x && first.pan.y === second.pan.y;

  return isSameZoom && isSamePan;
};
