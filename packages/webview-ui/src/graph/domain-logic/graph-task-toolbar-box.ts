import type { GraphView } from '../common/graph-page.type.ts';
import type { AnchorBox } from '../common/keep-clear.type.ts';
import { nodeToolbarRectOf } from '../utils/widget-geometry.util.ts';

/** The toolbar span of task `toolbarId` at the camera now, shown or not; `null` while it has no toolbar or node. */
export const taskToolbarBoxOf = (view: Pick<GraphView, 'widgetRects'>, toolbarId: string | null): AnchorBox | null => {
  if (toolbarId === null) return null;

  const { selected } = view.widgetRects(toolbarId);

  if (selected === null) return null;

  return nodeToolbarRectOf(selected, 1, []);
};
