import { ellipsisSlotOf } from './widget-geometry.util.ts';
import type { MenuAnchor } from '../common/graph-widgets.type.ts';
import type { MenuTarget, RectPx } from '../common/widget.type.ts';

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
