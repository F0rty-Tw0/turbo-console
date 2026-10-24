import type { FlowEdgeGeometry, FlowEdgeReader, FlowEdgeSource } from '../common/flow.type.ts';

const HIGHLIGHTED_EDGES = '.highlighted';

/** One edge's drawn path in model coordinates; `null` while an endpoint is missing. */
const flowEdgeOf = (edge: FlowEdgeSource): FlowEdgeGeometry | null => {
  const source = edge.sourceEndpoint();
  const target = edge.targetEndpoint();
  const controlPoints = edge.controlPoints() ?? [];

  if (source === undefined || target === undefined) return null;

  const geometry: FlowEdgeGeometry = { source, target, controlPoints };

  return geometry;
};

const isPlaced = (geometry: FlowEdgeGeometry | null): geometry is FlowEdgeGeometry => geometry !== null;

/** The highlighted edges' paths, in the order Cytoscape holds them; an edge without both endpoints is skipped. */
export const flowEdgesOf = (cy: FlowEdgeReader): FlowEdgeGeometry[] => {
  const edges = cy.edges(HIGHLIGHTED_EDGES).map(flowEdgeOf);

  return edges.filter(isPlaced);
};
