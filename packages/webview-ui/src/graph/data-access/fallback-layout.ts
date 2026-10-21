import cytoscape from 'cytoscape';
import type { Position as CytoscapePosition, ElementDefinition, NodeSingular } from 'cytoscape';
import type { ElkEdge, ElkNode } from 'elkjs/lib/elk-api.js';

import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import { FALLBACK_SPACING_FACTOR, NODE_HEIGHT, NODE_PADDING_X } from '../common/graph.const.ts';

const nodeOf = (child: ElkNode): ElementDefinition => {
  const data = { id: child.id };
  const node: ElementDefinition = { data };

  return node;
};

const edgesOf = (edge: ElkEdge): ElementDefinition[] => {
  const [source] = edge.sources;
  const [target] = edge.targets;

  if (source === undefined || target === undefined) return [];

  const data = { id: edge.id, source, target };
  const definition: ElementDefinition = { data };

  return [definition];
};

const widerOf = (widest: number, child: ElkNode): number => Math.max(widest, child.width ?? 0);

/**
 * Cytoscape's `breadthfirst` on the main thread, for when ELK fails: dependents above their dependencies.
 * Headless nodes are 1 px square, so with `spacingFactor: 1` the layout returns a unit grid (column, depth), which is
 * scaled here to the widest node and to `FALLBACK_SPACING_FACTOR` node heights per row.
 */
export const breadthfirstPositions = (graph: ElkNode): Positions => {
  const children = graph.children ?? [];
  const elkEdges = graph.edges ?? [];
  const columnPitch = children.reduce(widerOf, 0) + NODE_PADDING_X;
  const rowPitch = NODE_HEIGHT * FALLBACK_SPACING_FACTOR;
  const nodes = children.map(nodeOf);
  const edges = elkEdges.flatMap(edgesOf);
  const elements = [...nodes, ...edges];
  const cy = cytoscape({ headless: true, elements });
  const scaled = (cell: CytoscapePosition): Position => {
    const position: Position = { x: cell.x * columnPitch, y: cell.y * rowPitch };

    return position;
  };
  const entryOf = (node: NodeSingular): [string, Position] => {
    const cell = node.position();

    return [node.id(), scaled(cell)];
  };

  cy.layout({ name: 'breadthfirst', directed: true, animate: false, spacingFactor: 1 }).run();

  const entries = cy.nodes().map(entryOf);

  cy.destroy();

  return Object.fromEntries(entries);
};
