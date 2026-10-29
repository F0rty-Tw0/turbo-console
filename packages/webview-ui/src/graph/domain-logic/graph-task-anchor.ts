import type { GraphView } from '../common/graph-page.type.ts';
import type { MenuAnchor } from '../common/graph-widgets.type.ts';
import type { AnchorBox } from '../common/keep-clear.type.ts';
import type { MenuTarget, RectPx } from '../common/widget.type.ts';
import { ellipsisSlotOf, nodeToolbarRectOf } from '../utils/widget-geometry.util.ts';

/** The "…" slot of the task toolbar of `toolbarId` placed at `rect`, and its "…" `opener`; `null` while `target` is another task or the toolbar is not placed. */
export const taskAnchorOf = (
  toolbarId: string | null,
  opener: HTMLButtonElement | null,
  rect: RectPx | null,
  target: MenuTarget
): MenuAnchor | null => {
  const id = target.kind === 'package' ? target.name : null;

  if (opener === null || rect === null || toolbarId !== id) return null;

  const anchor: MenuAnchor = { rect: ellipsisSlotOf(rect), opener };

  return anchor;
};

/** The toolbar span of task `toolbarId` at the camera now, shown or not; `null` while it has no toolbar or node. */
export const taskToolbarBoxOf = (view: Pick<GraphView, 'widgetRects'>, toolbarId: string | null): AnchorBox | null => {
  if (toolbarId === null) return null;

  const { selected } = view.widgetRects(toolbarId);

  if (selected === null) return null;

  return nodeToolbarRectOf(selected, 1, []);
};
