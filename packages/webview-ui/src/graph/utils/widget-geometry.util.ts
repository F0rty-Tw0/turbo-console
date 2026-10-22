import { WIDGET_BUTTON_PX, WIDGET_INSET_PX, WIDGET_MIN_BOX_PX } from '../common/graph.const.ts';
import type { LayerBounds, RectPx, RowButtonRects, RowKind, RowPlacement } from '../common/widget.type.ts';

const BOX_ROW_TOP_PX = 4;

const squareAt = (x: number, y: number): RectPx => {
  const square: RectPx = { x1: x, y1: y, x2: x + WIDGET_BUTTON_PX, y2: y + WIDGET_BUTTON_PX };

  return square;
};

/** The header row inside a box (centred in its 32 px band) or a collapsed node; `null` while the box is under `WIDGET_MIN_BOX_PX` wide. */
export const rowPlacementOf = (box: RectPx, kind: RowKind): RowPlacement | null => {
  const boxWidth = box.x2 - box.x1;

  if (boxWidth < WIDGET_MIN_BOX_PX) return null;

  const top = kind === 'box' ? BOX_ROW_TOP_PX : WIDGET_INSET_PX;
  const placement: RowPlacement = { x: box.x1 + WIDGET_INSET_PX, y: box.y1 + top, width: boxWidth - 2 * WIDGET_INSET_PX };

  return placement;
};

/** The chevron at the row's left end and the "…" at its right end. */
export const buttonRectsOf = (row: RowPlacement): RowButtonRects => {
  const chevron = squareAt(row.x, row.y);
  const ellipsis = squareAt(row.x + row.width - WIDGET_BUTTON_PX, row.y);
  const rects: RowButtonRects = { chevron, ellipsis };

  return rects;
};

/** The package "…": centred on the node's top-right corner, so it overhangs the node on purpose. */
export const packageButtonRectOf = (box: RectPx): RectPx => {
  const half = WIDGET_BUTTON_PX / 2;

  return squareAt(box.x2 - half, box.y1 - half);
};

/** The rect meets the layer (touching an edge does not count) and, with an overlay, ends at or left of where the overlay starts. */
export const isWidgetShown = (rect: RectPx, bounds: LayerBounds): boolean => {
  const meetsWidth = rect.x2 > 0 && rect.x1 < bounds.width;
  const meetsHeight = rect.y2 > 0 && rect.y1 < bounds.height;

  if (!meetsWidth || !meetsHeight) return false;

  return bounds.overlayLeft === null || rect.x2 <= bounds.overlayLeft;
};
