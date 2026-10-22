import type { KeepClearDeps } from '../common/graph-inspection.type.ts';
import { joinedBoxOf, keepClearNamesOf, keepClearPanOf } from '../utils/keep-clear.util.ts';

/**
 * Pans the inspection's anchors, a trace's ghosts and the package "…", clear of the details overlay, measured in
 * container px; no pan with nothing to clear or a box too wide to fit beside the overlay.
 */
export const keepClearInspection = (deps: KeepClearDeps): void => {
  const { view, page, aside, inspection, ghostNodes, buttonBox } = deps;
  const names = keepClearNamesOf(inspection, ghostNodes);
  const anchor = view.anchorBox(names);
  const button = buttonBox();
  const box = joinedBoxOf(anchor, button);

  if (box === null) return;

  const container = page.container.getBoundingClientRect();
  const overlay = aside.getBoundingClientRect();
  const overlayLeft = overlay.left - container.left;
  const dx = keepClearPanOf(box, container.width, overlayLeft);

  if (dx !== 0) view.panBy(dx);
};
