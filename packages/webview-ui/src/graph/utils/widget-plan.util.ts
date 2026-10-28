import { buttonRectsOf, isWidgetShown, packageButtonRectOf, rowPlacementOf } from './widget-geometry.util.ts';
import { ROW_FOCUS_MIN_PX } from '../common/graph.const.ts';
import type { FolderRect, RectPx, RowKind, RowPlan, WidgetPlan, WidgetPlanInput } from '../common/widget.type.ts';

/** The row of a box or collapsed node wide enough for one, with at least one button shown; else `null`. */
const rowPlanOf = (folder: string, rect: FolderRect, kind: RowKind, input: WidgetPlanInput): RowPlan | null => {
  const { bounds, rects } = input;
  const placement = rowPlacementOf(rect, kind, rects.zoom);

  if (placement === null) return null;

  const buttons = buttonRectsOf(placement);
  const isChevronShown = isWidgetShown(buttons.chevron, bounds);
  const isFocusShown = placement.width >= ROW_FOCUS_MIN_PX && isWidgetShown(buttons.focus, bounds);
  const isEllipsisShown = isWidgetShown(buttons.ellipsis, bounds);

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

/** The selected package's "…" while grouped and shown; the flat view has none. */
const packageButtonOf = (input: WidgetPlanInput): RectPx | null => {
  const { selected } = input.rects;

  if (!input.isGrouped || selected === null) return null;

  const rect = packageButtonRectOf(selected);
  const isShown = isWidgetShown(rect, input.bounds);

  return isShown ? rect : null;
};

/** One positioning pass: a row per box, then per collapsed node, that has a shown button, and the package "…". */
export const widgetPlanOf = (input: WidgetPlanInput): WidgetPlan => {
  const { rects } = input;
  const boxRows = rowsOf(rects.boxes, 'box', input);
  const collapsedRows = rowsOf(rects.collapsed, 'collapsed', input);
  const packageButton = packageButtonOf(input);
  const plan: WidgetPlan = { rows: [...boxRows, ...collapsedRows], packageButton };

  return plan;
};
