import {
  COLLAPSED_LABEL_MAX_PX,
  FOLDER_PADDING_PX,
  WIDGET_BUTTON_PX,
  WIDGET_INSET_PX,
  WIDGET_MIN_BOX_PX
} from '../common/graph.const.ts';
import type { LayerBounds, RectPx, RowButtonRects, RowKind, RowPlacement } from '../common/widget.type.ts';

/** The room a box row keeps above and below its buttons inside the band, in px. */
const BAND_MARGIN_PX = 2;

/** The smallest scale a box row is drawn at; under it the row is hidden. */
const MIN_ROW_SCALE = 0.5;

const squareAt = (x: number, y: number, side: number): RectPx => {
  const square: RectPx = { x1: x, y1: y, x2: x + side, y2: y + side };

  return square;
};

/** A box row's scale: 1 while the band drawn at `zoom` fits full-size buttons with 2 px on each side, else shrunk to fit it; `null` under `MIN_ROW_SCALE`. */
const boxScaleOf = (zoom: number): number | null => {
  const room = FOLDER_PADDING_PX * zoom - 2 * BAND_MARGIN_PX;
  const scale = Math.min(1, room / WIDGET_BUTTON_PX);

  if (scale < MIN_ROW_SCALE) return null;

  return scale;
};

/** The box row, scaled to the band and centred in it, with insets scaled alike. */
const boxRowOf = (box: RectPx, zoom: number): RowPlacement | null => {
  const scale = boxScaleOf(zoom);

  if (scale === null) return null;

  const inset = WIDGET_INSET_PX * scale;
  const band = FOLDER_PADDING_PX * zoom;
  const width = (box.x2 - box.x1 - 2 * inset) / scale;
  const placement: RowPlacement = { x: box.x1 + inset, y: box.y1 + (band - WIDGET_BUTTON_PX * scale) / 2, width, scale };

  return placement;
};

/** The collapsed row, 8 px in; `null` while its buttons could meet the widest label centred on the node. */
const collapsedRowOf = (box: RectPx, zoom: number): RowPlacement | null => {
  const boxWidth = box.x2 - box.x1;
  const labelGap = (boxWidth - COLLAPSED_LABEL_MAX_PX * zoom) / 2;
  const isLabelReached = labelGap < WIDGET_INSET_PX + WIDGET_BUTTON_PX;

  if (isLabelReached) return null;

  const placement: RowPlacement = {
    x: box.x1 + WIDGET_INSET_PX,
    y: box.y1 + WIDGET_INSET_PX,
    width: boxWidth - 2 * WIDGET_INSET_PX,
    scale: 1
  };

  return placement;
};

/**
 * The header row inside a box (scaled to its rendered band and centred in it) or a collapsed node (8 px in); `null`
 * while the box is under `WIDGET_MIN_BOX_PX` wide, or by the box or collapsed rule at `zoom`.
 */
export const rowPlacementOf = (box: RectPx, kind: RowKind, zoom: number): RowPlacement | null => {
  const boxWidth = box.x2 - box.x1;

  if (boxWidth < WIDGET_MIN_BOX_PX) return null;

  if (kind === 'box') return boxRowOf(box, zoom);

  return collapsedRowOf(box, zoom);
};

/** The chevron at the row's left end and the "…" at its right end, as drawn at the row's scale. */
export const buttonRectsOf = (row: RowPlacement): RowButtonRects => {
  const side = WIDGET_BUTTON_PX * row.scale;
  const chevron = squareAt(row.x, row.y, side);
  const ellipsis = squareAt(row.x + row.width * row.scale - side, row.y, side);
  const rects: RowButtonRects = { chevron, ellipsis };

  return rects;
};

/** The package "…": centred on the node's top-right corner, so it overhangs the node on purpose. */
export const packageButtonRectOf = (box: RectPx): RectPx => {
  const half = WIDGET_BUTTON_PX / 2;

  return squareAt(box.x2 - half, box.y1 - half, WIDGET_BUTTON_PX);
};

/** The rect meets the layer (touching an edge does not count) and, with an overlay, ends at or left of where the overlay starts. */
export const isWidgetShown = (rect: RectPx, bounds: LayerBounds): boolean => {
  const meetsWidth = rect.x2 > 0 && rect.x1 < bounds.width;
  const meetsHeight = rect.y2 > 0 && rect.y1 < bounds.height;

  if (!meetsWidth || !meetsHeight) return false;

  return bounds.overlayLeft === null || rect.x2 <= bounds.overlayLeft;
};
