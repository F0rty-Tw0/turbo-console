import type { Core, EventObject, EventObjectEdge, EventObjectNode, NodeSingular } from 'cytoscape';

import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewHandlers } from '../common/graph-page.type.ts';
import { DOUBLE_TAP_MS, GHOST_CLASS } from '../common/graph.const.ts';

const centreEntryOf = (node: NodeSingular): [string, Position] => {
  const { x, y } = node.position();
  const centre: Position = { x, y };

  return [node.id(), centre];
};

const nodeName = (event: EventObjectNode): string => event.target.id();

const isGhost = (event: EventObjectNode | EventObjectEdge): boolean => event.target.hasClass(GHOST_CLASS);

const positionsOf = (cy: Core): Positions => {
  const entries = cy.nodes().map(centreEntryOf);

  return Object.fromEntries(entries);
};

/**
 * Reports the canvas events to `handlers`; the tap on the background is the core's own, never a node's or edge's, and a
 * ghost's taps report nothing. A double tap is two taps on the same package id within `DOUBLE_TAP_MS`, detected here:
 * Cytoscape's `dbltap` fires on timing alone, whatever the first tap hit, and spends the pair so a real double-click
 * right after a tap elsewhere never fires. Ids, not elements, so a redraw between the taps keeps the pair.
 */
export const listen = (cy: Core, handlers: GraphViewHandlers): void => {
  let lastPackage: string | null = null;
  let lastTapAt = Number.NEGATIVE_INFINITY;

  /** Records a tap on `name` (`null`: anything but a package) and says whether it completes a double tap. */
  const noteTap = (name: string | null, at: number): boolean => {
    const isDouble = name !== null && name === lastPackage && at - lastTapAt <= DOUBLE_TAP_MS;

    lastPackage = isDouble ? null : name;
    lastTapAt = at;

    return isDouble;
  };
  const onBackground = (event: EventObject): void => {
    if (event.target !== cy) return;

    noteTap(null, event.timeStamp);
    handlers.onTapBackground();
  };
  const onNode = (event: EventObjectNode): void => {
    const ghost = isGhost(event);
    const id = nodeName(event);
    const name = ghost ? null : id;
    const isDouble = noteTap(name, event.timeStamp);

    if (name === null) return;

    handlers.onTapNode(name);

    if (isDouble) handlers.onDoubleTapNode(name);
  };
  const onEdge = (event: EventObjectEdge): void => {
    const ghost = isGhost(event);

    noteTap(null, event.timeStamp);

    if (ghost) return;

    const source = event.target.source().id();
    const target = event.target.target().id();

    handlers.onTapEdge(source, target);
  };

  cy.on('tap', 'node', onNode);
  cy.on('tap', 'edge', onEdge);
  cy.on('tap', onBackground);
  cy.on('dragfree', 'node', (): void => handlers.onDragEnd(positionsOf(cy)));
  cy.on('viewport', handlers.onViewport);
  cy.on('render', handlers.onRender);
};
