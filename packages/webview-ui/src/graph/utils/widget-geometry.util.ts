import {
  FOLDER_PADDING_PX,
  NODE_HEIGHT,
  NODE_TOOLBAR_GAP_PX,
  NODE_TOOLBAR_MIN_PX,
  WIDGET_BUTTON_PX,
  WIDGET_GAP_PX,
  WIDGET_INSET_PX,
  WIDGET_MIN_BOX_PX
} from '../common/graph.const.ts';
import type { FolderRect, LayerBounds, RectPx, RowButtonRects, RowKind, RowPlacement } from '../common/widget.type.ts';

/** The room a box row keeps above and below its buttons inside the band, in px. */
const BAND_MARGIN_PX = 2;

/** The smallest scale a header row is drawn at; under it the row is hidden. */
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

/**
 * The collapsed row, scaled with the zoom up to full size and 8 px in at that scale; `null` under `MIN_ROW_SCALE`. The
 * canvas draws the node's label only while it has no row (`markRowLess`), so the buttons never meet that label.
 */
const collapsedRowOf = (box: RectPx, zoom: number): RowPlacement | null => {
  const scale = Math.min(1, zoom);

  if (scale < MIN_ROW_SCALE) return null;

  const inset = WIDGET_INSET_PX * scale;
  const width = (box.x2 - box.x1 - 2 * inset) / scale;
  const placement: RowPlacement = { x: box.x1 + inset, y: box.y1 + inset, width, scale };

  return placement;
};

/**
 * The header row inside a box (scaled to its rendered band and centred in it) or a collapsed node (scaled with the
 * zoom, 8 px in), placed on its rect; `null` while its plain-border width is under `WIDGET_MIN_BOX_PX`, so selecting it
 * never shows or hides the row, or under the half-size floor at `zoom`.
 */
export const rowPlacementOf = (folder: FolderRect, kind: RowKind, zoom: number): RowPlacement | null => {
  if (folder.width < WIDGET_MIN_BOX_PX) return null;

  if (kind === 'box') return boxRowOf(folder.rect, zoom);

  return collapsedRowOf(folder.rect, zoom);
};

/** The chevron at the row's left end, the "…" at its right end and Focus folder one button and gap left of the "…", as drawn at the row's scale. */
export const buttonRectsOf = (row: RowPlacement): RowButtonRects => {
  const side = WIDGET_BUTTON_PX * row.scale;
  const chevron = squareAt(row.x, row.y, side);
  const ellipsis = squareAt(row.x + row.width * row.scale - side, row.y, side);
  const focusOffset = (WIDGET_BUTTON_PX + WIDGET_GAP_PX) * row.scale;
  const focus = squareAt(ellipsis.x1 - focusOffset, row.y, side);
  const rects: RowButtonRects = { chevron, focus, ellipsis };

  return rects;
};

/** A placed row's drawn rect. */
export const rowRectOf = (row: RowPlacement): RectPx => {
  const rect: RectPx = { x1: row.x, y1: row.y, x2: row.x + row.width * row.scale, y2: row.y + WIDGET_BUTTON_PX * row.scale };

  return rect;
};

/** The two rects share area; touching does not count, as in `isWidgetShown`. */
const isMeeting = (first: RectPx, second: RectPx): boolean => {
  const meetsX = first.x1 < second.x2 && second.x1 < first.x2;
  const meetsY = first.y1 < second.y2 && second.y1 < first.y2;

  return meetsX && meetsY;
};

/** Whether the node is too short on screen for its toolbar: only the "…" stays. */
export const isNodeToolbarCompact = (zoom: number): boolean => NODE_HEIGHT * zoom < NODE_TOOLBAR_MIN_PX;

/** The buttons a node toolbar of `fullCount` shows at `zoom`: the "…" alone while compact. */
export const nodeToolbarCountAt = (zoom: number, fullCount: number): number => {
  const isCompact = isNodeToolbarCompact(zoom);

  return isCompact ? 1 : fullCount;
};

/** A node's toolbar: right edge on the node's, unscaled at every zoom; flips below once when it meets a header row or leaves the layer top; a below-rect that meets a row stays. */
export const nodeToolbarRectOf = (node: RectPx, count: number, rows: RectPx[]): RectPx => {
  const width = count * WIDGET_BUTTON_PX + (count - 1) * WIDGET_GAP_PX;
  const x1 = node.x2 - width;
  const aboveY = node.y1 - NODE_TOOLBAR_GAP_PX - WIDGET_BUTTON_PX;
  const above: RectPx = { x1, y1: aboveY, x2: node.x2, y2: aboveY + WIDGET_BUTTON_PX };
  const meetsRow = rows.some((row) => isMeeting(above, row));
  const isFlipped = above.y1 < 0 || meetsRow;

  if (!isFlipped) return above;

  const belowY = node.y2 + NODE_TOOLBAR_GAP_PX;
  const below: RectPx = { x1, y1: belowY, x2: node.x2, y2: belowY + WIDGET_BUTTON_PX };

  return below;
};

/** The "…" slot of a node toolbar: its last button, where the "…" sits at every width. */
export const ellipsisSlotOf = (toolbar: RectPx): RectPx => {
  const slot: RectPx = { ...toolbar, x1: toolbar.x2 - WIDGET_BUTTON_PX };

  return slot;
};

/** The rect meets the layer (touching an edge does not count) and, with an overlay, ends at or left of where the overlay starts. */
export const isWidgetShown = (rect: RectPx, bounds: LayerBounds): boolean => {
  const meetsWidth = rect.x2 > 0 && rect.x1 < bounds.width;
  const meetsHeight = rect.y2 > 0 && rect.y1 < bounds.height;

  if (!meetsWidth || !meetsHeight) return false;

  return bounds.overlayLeft === null || rect.x2 <= bounds.overlayLeft;
};

/** The toolbar rect of a node toolbar of `count` buttons, `null` while the node or the toolbar is not shown in the layer. */
export const shownNodeToolbarOf = (node: RectPx, count: number, rows: RectPx[], bounds: LayerBounds): RectPx | null => {
  const isNodeShown = isWidgetShown(node, bounds);

  if (!isNodeShown) return null;

  const rect = nodeToolbarRectOf(node, count, rows);
  const isShown = isWidgetShown(rect, bounds);

  return isShown ? rect : null;
};

/** A details panel's left edge in container px while it overlays the canvas, else `null`: closed, docked or not built. */
export const overlayLeftOf = (
  panel: Pick<HTMLElement, 'hidden' | 'offsetLeft'> | null,
  container: Pick<HTMLElement, 'offsetLeft'>,
  isOverlay: boolean
): number | null => {
  if (panel === null || !isOverlay || panel.hidden) return null;

  return panel.offsetLeft - container.offsetLeft;
};
