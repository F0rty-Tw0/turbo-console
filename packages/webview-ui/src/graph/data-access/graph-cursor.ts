import type { Core } from 'cytoscape';

import { OVER_ELEMENT_CLASS } from '../common/graph.const.ts';

/** Paints the pointer cursor of the canvas: over a node or an edge, or not. */
type CursorPaint = (isOver: boolean) => void;

/**
 * Calls `paint` when the pointer starts or stops being over a node or an edge, never twice in a row with one value.
 * A `mouseout` ends it, a node's or edge's bubbling up as well as the core's own when the pointer leaves the canvas, and
 * so does `viewport`: a pan or zoom moves the elements under a still pointer. Cytoscape sends no `mouseover` when the
 * pointer returns to the node it left, so a `mousemove` on an element starts it again (as `listenHover` does).
 */
export const listenCursor = (cy: Core, paint: CursorPaint): void => {
  let isOver = false;
  const set = (next: boolean): void => {
    if (next === isOver) return;

    isOver = next;
    paint(next);
  };
  const onEnter = (): void => set(true);
  const onLeave = (): void => set(false);

  cy.on('mouseover mousemove', 'node, edge', onEnter);
  cy.on('mouseout viewport', onLeave);
};

/** The painter that marks the Cytoscape container; nothing while headless. */
export const containerPainterOf = (cy: Core): CursorPaint => {
  const paint = (isOver: boolean): void => {
    cy.container()?.classList.toggle(OVER_ELEMENT_CLASS, isOver);
  };

  return paint;
};
