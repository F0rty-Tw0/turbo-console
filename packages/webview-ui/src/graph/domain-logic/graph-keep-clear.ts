import type { KeepClearDeps } from '../common/graph-inspection.type.ts';
import { anchorsOf, keepClearPanOf } from '../utils/keep-clear.util.ts';

/** Pans the inspection's anchors clear of the details overlay, measured in container px; no pan with nothing to clear. */
export const keepClearInspection = (deps: KeepClearDeps): void => {
  const { view, page, inspection } = deps;
  const aside = page.body.querySelector('#graph-details');
  const anchors = anchorsOf(inspection);
  const box = view.anchorBox(anchors);

  if (aside === null || box === null) return;

  const container = page.container.getBoundingClientRect();
  const overlay = aside.getBoundingClientRect();
  const overlayLeft = overlay.left - container.left;
  const dx = keepClearPanOf(box, container.width, overlayLeft);

  if (dx !== 0) view.panBy(dx);
};
