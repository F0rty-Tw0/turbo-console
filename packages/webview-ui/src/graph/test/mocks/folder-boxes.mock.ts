import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';

import { graphStyleOf } from '../../data-access/graph-style.ts';
import { BOX_ELEMENTS_STUB } from '../stubs/folder-boxes.stub.ts';
import { CANVAS_COLORS } from '../utils/canvas-elements.spec.util.ts';

/** A headless Cytoscape of `BOX_ELEMENTS_STUB`, positions kept as given (no fit), with the page's stylesheet. */
export const boxedCyMock = (): Core => {
  const layout = { name: 'preset', fit: false };
  const cy = cytoscape({ headless: true, styleEnabled: true, layout, elements: BOX_ELEMENTS_STUB });
  const style = graphStyleOf(CANVAS_COLORS, 'sans-serif');

  cy.style(style);

  return cy;
};

/** An element stub whose client rect starts at `left`, `top`; only `getBoundingClientRect` exists, as the node test environment has no DOM. */
export const containerAtMock = (left: number, top: number): HTMLElement => {
  const rect = { left, top };
  const getBoundingClientRect = (): typeof rect => rect;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- a stub of the one method the probe reads
  const element: HTMLElement = Object.assign(Object.create(null), { getBoundingClientRect });

  return element;
};
