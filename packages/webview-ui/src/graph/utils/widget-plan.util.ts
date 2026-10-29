import {
  buttonRectsOf,
  isWidgetShown,
  nodeToolbarCountAt,
  nodeToolbarRectOf,
  rowPlacementOf,
  rowRectOf
} from './widget-geometry.util.ts';
import { ROW_FOCUS_MIN_PX } from '../common/graph.const.ts';
import type { FolderRect, RectPx, RowKind, RowPlan, WidgetPlan, WidgetPlanInput } from '../common/widget.type.ts';

/** The row of a box or collapsed node wide enough for one, with at least one button shown; else `null`. */
const rowPlanOf = (folder: string, rect: FolderRect, kind: RowKind, input: WidgetPlanInput): RowPlan | null => {
  const { bounds, rects } = input;
  const placement = rowPlacementOf(rect, kind, rects.zoom);

  if (placement === null) return null;

  const buttons = buttonRectsOf(placement);
  const isChevronShown = isWidgetShown(buttons.chevron, bounds);
  const isEllipsisShown = isWidgetShown(buttons.ellipsis, bounds);
  const isFocusShown = isEllipsisShown && placement.width >= ROW_FOCUS_MIN_PX && isWidgetShown(buttons.focus, bounds);

  if (!isChevronShown && !isEllipsisShown) return null;

  const row: RowPlan = { folder, kind, placement, isChevronShown, isFocusShown, isEllipsisShown };

  return row;
};

const rowsOf = (rects: ReadonlyMap<string, FolderRect>, kind: RowKind, input: WidgetPlanInput): RowPlan[] => {
  const rows: RowPlan[] = [];

  for (const [folder, rect] of rects) {
    const row = rowPlanOf(folder, rect, kind, input);

    if (row !== null) rows.push(row);
  }

  return rows;
};

/** The rect of a plan row, for the node toolbar to avoid. */
const rowRectOfPlan = (row: RowPlan): RectPx => rowRectOf(row.placement);

/**
 * The selected package's node toolbar, flat or grouped, while its node is shown: above the node, below it on a header
 * row, the "…" alone under `NODE_TOOLBAR_MIN_PX`.
 */
const nodeToolbarOf = (input: WidgetPlanInput, rows: RowPlan[]): RectPx | null => {
  const { selected, zoom } = input.rects;

  if (selected === null) return null;

  const isNodeShown = isWidgetShown(selected, input.bounds);

  if (!isNodeShown) return null;

  const count = nodeToolbarCountAt(zoom, input.toolbarCount);
  const rect = nodeToolbarRectOf(selected, count, rows.map(rowRectOfPlan));
  const isShown = isWidgetShown(rect, input.bounds);

  return isShown ? rect : null;
};

/** One positioning pass: a row per box, then per collapsed node, that has a shown button, and the node toolbar. */
export const widgetPlanOf = (input: WidgetPlanInput): WidgetPlan => {
  const { rects } = input;
  const boxRows = rowsOf(rects.boxes, 'box', input);
  const collapsedRows = rowsOf(rects.collapsed, 'collapsed', input);
  const rows = [...boxRows, ...collapsedRows];
  const nodeToolbar = nodeToolbarOf(input, rows);
  const plan: WidgetPlan = { rows, nodeToolbar };

  return plan;
};
