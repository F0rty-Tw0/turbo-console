import type { KeepClearDeps } from '../common/graph-inspection.type.ts';
import { keepClearNamesOf, keepClearPanOf } from '../utils/keep-clear.util.ts';

/**
 * Pans the inspection's anchors, and a trace's ghosts, clear of the details overlay, measured in container px; no pan
 * with nothing to clear or a box too wide to fit beside the overlay.
 */
export const keepClearInspection = (deps: KeepClearDeps): void => {
  const { view, page, aside, inspection, ghostNodes } = deps;
  const names = keepClearNamesOf(inspection, ghostNodes);
  const box = view.anchorBox(names);

  if (box === null) return;

  const container = page.container.getBoundingClientRect();
  const overlay = aside.getBoundingClientRect();
  const overlayLeft = overlay.left - container.left;
  const dx = keepClearPanOf(box, container.width, overlayLeft);

  if (dx !== 0) view.panBy(dx);
};
