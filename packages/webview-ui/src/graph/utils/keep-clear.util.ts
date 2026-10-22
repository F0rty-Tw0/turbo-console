import { collapsedIdOf, folderIdOf } from './folder-id.util.ts';
import { KEEP_CLEAR_MARGIN_PX } from '../common/graph.const.ts';
import type { Inspection } from '../common/inspection.type.ts';
import type { AnchorBox } from '../common/keep-clear.type.ts';

/**
 * The horizontal pan (negative moves left) that clears `box` of an overlay covering `x >= overlayLeft`;
 * 0 when the box is already clear or too wide to fit in the uncovered part.
 */
export const keepClearPanOf = (box: AnchorBox, containerWidth: number, overlayLeft: number): number => {
  const uncovered = Math.min(containerWidth, overlayLeft);
  const limit = overlayLeft - KEEP_CLEAR_MARGIN_PX;
  const roomToFit = uncovered - 2 * KEEP_CLEAR_MARGIN_PX;
  const isUnderOverlay = box.x2 > limit;
  const isFitting = box.x2 - box.x1 <= roomToFit;

  if (!isUnderOverlay || !isFitting) return 0;

  return limit - box.x2;
};

/** The element ids the camera keeps clear of the overlay for this inspection: package names, or a folder's box and collapsed node ids. */
export const anchorsOf = (inspection: Inspection): string[] => {
  switch (inspection.kind) {
    case 'none':
      return [];
    case 'package':
      return [inspection.name];
    case 'link':
      return [inspection.source, inspection.target];
    case 'folder':
      return [folderIdOf(inspection.folder), collapsedIdOf(inspection.folder)];
    case 'picking':
      return [inspection.start];
    case 'trace':
      return [inspection.start, inspection.end];
  }
};

/** The names kept clear: the anchors, plus for a trace its drawn ghosts, so a refit that framed them does not pan them off. */
export const keepClearNamesOf = (inspection: Inspection, ghostNodes: string[]): string[] => {
  const anchors = anchorsOf(inspection);

  if (inspection.kind !== 'trace') return anchors;

  const names = new Set([...anchors, ...ghostNodes]);

  return [...names];
};
