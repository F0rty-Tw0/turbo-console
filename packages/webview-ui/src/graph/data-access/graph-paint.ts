import type { Core, EdgeSingular, NodeSingular } from 'cytoscape';

import { packageEdges, packageNodes } from './graph-boxes.ts';
import { setClassesAmong } from './graph-classes.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import { STATE_CLASS_NAMES } from '../common/graph.const.ts';
import type { Paint } from '../common/paint.type.ts';

/** Gives each package and package link exactly one state class; any other class (`ghost`) and the folder elements are left alone. */
export const applyPaint = (cy: Core, paint: Paint): void => {
  const classNode = (node: NodeSingular): void => {
    const state = paint.nodeState(node.id());

    setClassesAmong(node, STATE_CLASS_NAMES, [state]);
  };
  const classEdge = (edge: EdgeSingular): void => {
    const source = edge.source().id();
    const target = edge.target().id();
    const ends: GraphEdge = { source, target };
    const state = paint.edgeState(ends);

    setClassesAmong(edge, STATE_CLASS_NAMES, [state]);
  };

  cy.batch((): void => {
    packageNodes(cy).forEach(classNode);
    packageEdges(cy).forEach(classEdge);
  });
};
