import type { Core, EdgeSingular, NodeSingular } from 'cytoscape';

import { packageNodes } from './graph-boxes.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { Paint } from '../common/paint.type.ts';

const STATE_CLASSES = 'selected highlighted dimmed normal';

/** Gives each package and link exactly one state class; any other class (`ghost`) is left alone. */
export const applyPaint = (cy: Core, paint: Paint): void => {
  const classNode = (node: NodeSingular): void => {
    const state = paint.nodeState(node.id());

    node.removeClass(STATE_CLASSES).addClass(state);
  };
  const classEdge = (edge: EdgeSingular): void => {
    const source = edge.source().id();
    const target = edge.target().id();
    const ends: GraphEdge = { source, target };
    const state = paint.edgeState(ends);

    edge.removeClass(STATE_CLASSES).addClass(state);
  };

  cy.batch((): void => {
    packageNodes(cy).forEach(classNode);
    cy.edges().forEach(classEdge);
  });
};
