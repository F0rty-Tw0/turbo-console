import type { Core } from 'cytoscape';

import { EXPORTING_CLASS, EXPORT_MAX_PX, EXPORT_MAX_SCALE } from '../common/graph.const.ts';

/** The `cy.png` scale that keeps both sides at `EXPORT_MAX_PX` or less; `cy.png` multiplies by the device pixel ratio itself, so it is divided out here. */
const scaleOf = (cy: Core, pixelRatio: number): number => {
  const { w, h } = cy.elements(':visible').boundingBox();
  const limit = Math.min(EXPORT_MAX_SCALE, EXPORT_MAX_PX / Math.ceil(w), EXPORT_MAX_PX / Math.ceil(h));

  return limit / pixelRatio;
};

/** The visible graph as base64 PNG at `pixelRatio`-corrected scale, folder titles drawn; a throw from `cy.png` reaches the caller, the class is removed either way. */
export const exportPngOf = (cy: Core, bg: string, pixelRatio: number): string => {
  const boxes = cy.nodes(':parent');

  boxes.addClass(EXPORTING_CLASS);

  try {
    const scale = scaleOf(cy, pixelRatio);

    return cy.png({ output: 'base64', full: true, scale, bg });
  } finally {
    boxes.removeClass(EXPORTING_CLASS);
  }
};
