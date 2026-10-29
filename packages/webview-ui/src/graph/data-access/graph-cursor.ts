import type { Core, EventObjectEdge, EventObjectNode, SingularElementArgument } from 'cytoscape';

import { GHOST_CLASS, OVER_ELEMENT_CLASS } from '../common/graph.const.ts';

/** Paints the pointer cursor of the canvas: over a node or edge other than a ghost, or not. */
type CursorPaint = (isOver: boolean) => void;

/** `listen` ignores a tap on a ghost, so it is not clickable. */
const isClickable = (element: SingularElementArgument): boolean => !element.hasClass(GHOST_CLASS);

/**
 * Calls `paint` when the pointer starts or stops being over a node or edge that is not a ghost, never
 * twice in a row with one value. A `mouseout` ends it, a node's or edge's bubbling up as well as the core's own when the pointer leaves the
 * canvas, and so does `viewport`: a pan or zoom moves the elements under a still pointer. Cytoscape sends no
 * `mouseover` when the pointer returns to the node it left, so a `mousemove` on an element starts it again (as
 * `listenHover` does).
 */
export const listenCursor = (cy: Core, paint: CursorPaint): void => {
  let isOver = false;
  const set = (next: boolean): void => {
    if (next === isOver) return;

    isOver = next;
    paint(next);
  };
  const onEnter = (event: EventObjectNode | EventObjectEdge): void => set(isClickable(event.target));
  const onLeave = (): void => set(false);

  cy.on('mouseover mousemove', 'node, edge', onEnter);
  cy.on('mouseout viewport', onLeave);
};

/**
 * The painter that marks the element holding the Cytoscape container; nothing while headless. Not the container itself:
 * Cytoscape redraws the whole canvas 100 ms after any attribute change on its container.
 */
export const containerPainterOf = (cy: Core): CursorPaint => {
  const paint = (isOver: boolean): void => {
    cy.container()?.parentElement?.classList.toggle(OVER_ELEMENT_CLASS, isOver);
  };

  return paint;
};
