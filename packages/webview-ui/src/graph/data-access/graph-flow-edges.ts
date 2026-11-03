import type { FlowEdgeGeometry, FlowEdgeReader, FlowEdgeSource } from '../common/flow.type.ts';
import { ROUTED_CLASS } from '../common/graph-layout.const.ts';
import { TASK_LINK_CLASS } from '../common/graph-task.const.ts';

/** Task graph edges only: until a task layout is placed, the package graph and its highlight stay on the core. */
const HIGHLIGHTED_LINKS = `.${TASK_LINK_CLASS}.highlighted`;

/** One edge's drawn path in model coordinates, a routed edge through its segment points; `null` while an endpoint is missing. */
const flowEdgeOf = (edge: FlowEdgeSource): FlowEdgeGeometry | null => {
  const source = edge.sourceEndpoint();
  const target = edge.targetEndpoint();
  const isPolyline = edge.hasClass(ROUTED_CLASS);
  const segmentPoints = edge.segmentPoints();
  const curvePoints = edge.controlPoints();
  const bends = isPolyline ? segmentPoints : curvePoints;
  const controlPoints = bends ?? [];

  if (source === undefined || target === undefined) return null;

  const geometry: FlowEdgeGeometry = { source, target, controlPoints, isPolyline };

  return geometry;
};

const isPlaced = (geometry: FlowEdgeGeometry | null): geometry is FlowEdgeGeometry => geometry !== null;

/** The highlighted task edges' paths, in the order Cytoscape holds them; an edge without both endpoints is skipped. */
export const flowEdgesOf = (cy: FlowEdgeReader): FlowEdgeGeometry[] => {
  const edges = cy.edges(HIGHLIGHTED_LINKS).map(flowEdgeOf);

  return edges.filter(isPlaced);
};
