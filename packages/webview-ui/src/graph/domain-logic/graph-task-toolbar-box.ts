import type { GraphView } from '../common/graph-page.type.ts';
import type { AnchorBox } from '../common/keep-clear.type.ts';
import { nodeToolbarRectOf } from '../utils/widget-geometry.util.ts';

/** The toolbar span of task `toolbarId` at the camera now, with the `countAt` buttons it shows at that zoom, placed or not; `null` while it has no toolbar, no node or no shown button. */
export const taskToolbarBoxOf = (
  view: Pick<GraphView, 'widgetRects'>,
  toolbarId: string | null,
  countAt: (zoom: number) => number
): AnchorBox | null => {
  if (toolbarId === null) return null;

  const { selected, zoom } = view.widgetRects(toolbarId);
  const count = countAt(zoom);

  if (selected === null || count === 0) return null;

  return nodeToolbarRectOf(selected, count, []);
};
