import type { BoundingBox12, BoundingBoxWH } from 'cytoscape';

import type { Position } from '../../bridge/common/graph-state.type.ts';
import { OPEN_ZOOM_FLOOR } from '../common/graph-layout.const.ts';
import type { Viewport } from '../common/graph-page.type.ts';
import type { Size } from '../common/widget.type.ts';

/**
 * The viewport a graph opens at when its fit zoom (Cytoscape's own `min((W - 2p) / w, (H - 2p) / h)`) is below `OPEN_ZOOM_FLOOR`:
 * the floor, centred on the box horizontally and `paddingPx` under the canvas top. `null` when the true fit should run: a fit at or
 * above the floor, an empty box, or a canvas no larger than twice its padding.
 */
export const flooredViewportOf = (box: BoundingBox12 & BoundingBoxWH, canvas: Size, paddingPx: number): Viewport | null => {
  const room: Size = { width: canvas.width - 2 * paddingPx, height: canvas.height - 2 * paddingPx };
  const isDegenerate = box.w <= 0 || box.h <= 0 || room.width <= 0 || room.height <= 0;

  if (isDegenerate) return null;

  const fitZoom = Math.min(room.width / box.w, room.height / box.h);

  if (fitZoom >= OPEN_ZOOM_FLOOR) return null;

  const centreX = (box.x1 + box.x2) / 2;
  const pan: Position = { x: canvas.width / 2 - centreX * OPEN_ZOOM_FLOOR, y: paddingPx - box.y1 * OPEN_ZOOM_FLOOR };
  const floored: Viewport = { zoom: OPEN_ZOOM_FLOOR, pan };

  return floored;
};
