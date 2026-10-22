import type { LayerBounds, MenuTarget, Point, RectPx, Size, WidgetRects } from '../common/widget.type.ts';

/** The layer part no overlay covers. */
export const uncoveredAreaOf = (bounds: LayerBounds): RectPx => {
  const area: RectPx = { x1: 0, y1: 0, x2: bounds.overlayLeft ?? bounds.width, y2: bounds.height };

  return area;
};

/** Below the anchor with left edges aligned; flips left (right edges aligned) or up (bottom on the anchor top) at the area's far edges, then clamps to its near ones. */
export const menuPlaceOf = (anchor: RectPx, menu: Size, area: RectPx): Point => {
  const isPastRight = anchor.x1 + menu.width > area.x2;
  const isPastBottom = anchor.y2 + menu.height > area.y2;
  const flippedLeft = anchor.x2 - menu.width;
  const flippedTop = anchor.y1 - menu.height;
  const left = isPastRight ? flippedLeft : anchor.x1;
  const top = isPastBottom ? flippedTop : anchor.y2;
  const place: Point = { x: Math.max(left, area.x1), y: Math.max(top, area.y1) };

  return place;
};

/** The drawn rect a menu for `target` opens beside when it has no shown "…": its box or collapsed node, or the selected package. */
export const targetRectOf = (rects: WidgetRects, target: MenuTarget): RectPx | null => {
  if (target.kind === 'package') return rects.selected;

  return rects.boxes.get(target.folder) ?? rects.collapsed.get(target.folder) ?? null;
};
