import type { Core, EventObject, EventObjectEdge, EventObjectNode, NodeSingular } from 'cytoscape';

import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewHandlers } from '../common/graph-page.type.ts';

const centreEntryOf = (node: NodeSingular): [string, Position] => {
  const { x, y } = node.position();
  const centre: Position = { x, y };

  return [node.id(), centre];
};

const nodeName = (event: EventObjectNode): string => event.target.id();

const positionsOf = (cy: Core): Positions => {
  const entries = cy.nodes().map(centreEntryOf);

  return Object.fromEntries(entries);
};

/** Reports the canvas events to `handlers`; the tap on the background is the core's own, never a node's or edge's. */
export const listen = (cy: Core, handlers: GraphViewHandlers): void => {
  const onBackground = (event: EventObject): void => {
    if (event.target === cy) handlers.onTapBackground();
  };
  const onEdge = (event: EventObjectEdge): void => {
    const source = event.target.source().id();
    const target = event.target.target().id();

    handlers.onTapEdge(source, target);
  };

  cy.on('tap', 'node', (event: EventObjectNode): void => handlers.onTapNode(nodeName(event)));
  cy.on('tap', 'edge', onEdge);
  cy.on('tap', onBackground);
  cy.on('dbltap', 'node', (event: EventObjectNode): void => handlers.onDoubleTapNode(nodeName(event)));
  cy.on('dragfree', 'node', (): void => handlers.onDragEnd(positionsOf(cy)));
  cy.on('viewport', handlers.onViewport);
  cy.on('render', handlers.onRender);
};
