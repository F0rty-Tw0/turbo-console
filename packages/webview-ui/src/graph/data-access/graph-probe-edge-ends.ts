import type { Core, NodeSingular } from 'cytoscape';

type WithRenderedStyle = {
  readonly rstyle: unknown;
};

type WithCleanConnected = {
  readonly cleanConnected: unknown;
};

const hasRenderedStyle = (value: unknown): value is WithRenderedStyle =>
  typeof value === 'object' && value !== null && 'rstyle' in value;

const hasCleanConnected = (value: unknown): value is WithCleanConnected =>
  typeof value === 'object' && value !== null && 'cleanConnected' in value;

/**
 * Whether Cytoscape still marks the edges of `node` dirty (cytoscape 3.34 `_private.rstyle.cleanConnected === false`), so
 * every read of their endpoints recomputes their projections. Throws when the element has no rendered style, so a
 * Cytoscape that renames it fails here and not as a silent pass.
 */
const keepsEdgesDirty = (node: NodeSingular): boolean => {
  const internals: unknown = Reflect.get(node, '_private');

  if (!hasRenderedStyle(internals)) throw new Error('graph e2e: no rendered style on a node');

  const { rstyle } = internals;

  return hasCleanConnected(rstyle) && rstyle.cleanConnected === false;
};

const idOf = (node: NodeSingular): string => node.id();

/** The sorted ids of the nodes whose edges Cytoscape still marks dirty; `[]` once its rendered style queue is flushed. */
export const dirtyEdgeEndIdsOf = (cy: Core): string[] => {
  const dirty = cy.nodes().filter(keepsEdgesDirty);
  const ids = dirty.map(idOf);

  return ids.sort();
};
