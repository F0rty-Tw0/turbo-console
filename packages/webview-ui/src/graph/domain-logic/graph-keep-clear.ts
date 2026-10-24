import type { KeepClearDeps } from '../common/graph-inspection.type.ts';
import type { GraphView } from '../common/graph-page.type.ts';
import type { AnchorBox } from '../common/keep-clear.type.ts';
import { joinedBoxOf, keepClearNamesOf, keepClearPanOf } from '../utils/keep-clear.util.ts';

/**
 * Pans `box`, in container px, clear of `aside`, a details panel overlaying the canvas; no pan with no box or a box too
 * wide to fit beside the panel.
 */
export const keepBoxClear = (
  view: Pick<GraphView, 'panBy'>,
  container: HTMLElement,
  aside: HTMLElement,
  box: AnchorBox | null
): void => {
  if (box === null) return;

  const bounds = container.getBoundingClientRect();
  const overlay = aside.getBoundingClientRect();
  const overlayLeft = overlay.left - bounds.left;
  const dx = keepClearPanOf(box, bounds.width, overlayLeft);

  if (dx !== 0) view.panBy(dx);
};

/** Pans the inspection's anchors, a trace's ghosts and the package "…", clear of the details overlay. */
export const keepClearInspection = (deps: KeepClearDeps): void => {
  const { view, page, aside, inspection, ghostNodes, buttonBox } = deps;
  const names = keepClearNamesOf(inspection, ghostNodes);
  const anchor = view.anchorBox(names);
  const button = buttonBox();
  const box = joinedBoxOf(anchor, button);

  keepBoxClear(view, page.container, aside, box);
};
