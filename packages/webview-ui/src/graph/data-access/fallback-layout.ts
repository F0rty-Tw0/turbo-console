import cytoscape from 'cytoscape';
import type { Position as CytoscapePosition, ElementDefinition } from 'cytoscape';
import type { ElkEdge, ElkNode } from 'elkjs/lib/elk-api.js';

import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import { FALLBACK_SPACING_FACTOR, NODE_HEIGHT, NODE_PADDING_X } from '../common/graph.const.ts';

/**
 * Cytoscape's BFS (`collection/algorithms/bfs-dfs.mjs`) keeps its visited and parent-edge tables in plain objects
 * keyed by node id, so an id like `constructor` reads `Object.prototype` there. The headless graph uses index ids.
 */
const cytoscapeIdOf = (index: number): string => `n${index}`;

const idEntryOf = (child: ElkNode, index: number): [string, string] => [child.id, cytoscapeIdOf(index)];

const nodeOf = (_child: ElkNode, index: number): ElementDefinition => {
  const data = { id: cytoscapeIdOf(index) };
  const node: ElementDefinition = { data };

  return node;
};

const edgesOf = (edge: ElkEdge, idsByName: Map<string, string>): ElementDefinition[] => {
  const [sourceName] = edge.sources;
  const [targetName] = edge.targets;

  if (sourceName === undefined || targetName === undefined) return [];

  const source = idsByName.get(sourceName);
  const target = idsByName.get(targetName);

  if (source === undefined || target === undefined) return [];

  const data = { id: `${source}>${target}`, source, target };
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
  const idEntries = children.map(idEntryOf);
  const idsByName = new Map(idEntries);
  const nodes = children.map(nodeOf);
  const edges = elkEdges.flatMap((edge: ElkEdge): ElementDefinition[] => edgesOf(edge, idsByName));
  const elements = [...nodes, ...edges];
  const cy = cytoscape({ headless: true, elements });
  const scaled = (cell: CytoscapePosition): Position => {
    const position: Position = { x: cell.x * columnPitch, y: cell.y * rowPitch };

    return position;
  };
  const entryOf = (child: ElkNode, index: number): [string, Position] => {
    const cell = cy.getElementById(cytoscapeIdOf(index)).position();

    return [child.id, scaled(cell)];
  };

  cy.layout({ name: 'breadthfirst', directed: true, animate: false, spacingFactor: 1 }).run();

  const entries = children.map(entryOf);

  cy.destroy();

  return Object.fromEntries(entries);
};
