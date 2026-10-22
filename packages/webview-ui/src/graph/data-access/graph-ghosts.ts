import type { Core, EdgeSingular, NodeSingular } from 'cytoscape';

import { showOnly } from './graph-visibility.ts';
import type { GhostMarks } from '../common/ghost.type.ts';
import { GHOST_CLASS } from '../common/graph.const.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';

/** Clears every ghost class and display bypass: nodes are shown as `visible` says, links follow their ends. */
const resetGhosts = (cy: Core, visible: ReadonlySet<string>): void => {
  cy.elements().removeClass(GHOST_CLASS);
  showOnly(cy, visible);
  cy.edges().removeStyle('display');
};

const applyGhosts = (cy: Core, marks: GhostMarks): void => {
  const names = new Set(marks.nodes);
  const pathIds = new Set(marks.edges.map(edgeIdOf));
  const isGhostNode = (node: NodeSingular): boolean => names.has(node.id());
  const isPathEdge = (edge: EdgeSingular): boolean => pathIds.has(edge.id());
  const nodes = cy.nodes().filter(isGhostNode);
  const pathEdges = cy.edges().filter(isPathEdge);

  nodes.style('display', 'element').addClass(GHOST_CLASS);
  pathEdges.addClass(GHOST_CLASS);
  nodes.connectedEdges().not(pathEdges).style('display', 'none');
};

/**
 * Draws the trace's hidden path packages as ghosts: shown, classed `ghost`, their path links classed `ghost` and
 * their other links hidden. Resets first, so empty `marks` clears; with no ghost drawn and none to draw it writes
 * nothing. `setVisible` hides a ghost again, so call this after every `setVisible`.
 */
export const setGhosts = (cy: Core, marks: GhostMarks, visible: ReadonlySet<string>): void => {
  const hadGhosts = cy.elements(`.${GHOST_CLASS}`).nonempty();
  const hasGhosts = marks.nodes.length > 0 || marks.edges.length > 0;

  if (!hadGhosts && !hasGhosts) return;

  cy.batch((): void => {
    resetGhosts(cy, visible);
    applyGhosts(cy, marks);
  });
};
