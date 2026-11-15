import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { FlowEdgeGeometry, FlowSegment } from '../common/flow.type.ts';

const isFinitePoint = (point: Position): boolean => Number.isFinite(point.x) && Number.isFinite(point.y);

/** A model point as drawn: `model * zoom + pan`. */
const renderedOf = (point: Position, pan: Position, zoom: number): Position => {
  const rendered: Position = { x: point.x * zoom + pan.x, y: point.y * zoom + pan.y };

  return rendered;
};

/** Straight segments joining each point to the next. */
const straightSegmentsOf = (points: Position[]): FlowSegment[] => {
  const segmentFrom = (from: Position, index: number): FlowSegment[] => {
    const to = points[index + 1];

    if (to === undefined) return [];

    const segment: FlowSegment = { from, control: null, to };

    return [segment];
  };

  return points.flatMap(segmentFrom);
};

/** The segments of one edge in rendered coordinates: none while a coordinate is not finite, a curve for one control point, else straight lines through the points. */
const edgeSegmentsOf = (edge: FlowEdgeGeometry, pan: Position, zoom: number): FlowSegment[] => {
  const raw = [edge.source, ...edge.controlPoints, edge.target];
  const isPlaced = raw.every(isFinitePoint);

  if (!isPlaced) return [];

  const render = (point: Position): Position => renderedOf(point, pan, zoom);
  const source = render(edge.source);
  const target = render(edge.target);
  const controls = edge.controlPoints.map(render);
  const [control = null] = controls;

  if (controls.length === 1) return [{ from: source, control, to: target }];

  return straightSegmentsOf([source, ...controls, target]);
};

/** Every edge's segments, in the edges' order, at the camera's `pan` and `zoom`; an edge not yet placed is skipped. */
export const flowSegmentsOf = (edges: FlowEdgeGeometry[], pan: Position, zoom: number): FlowSegment[] => {
  const render = (edge: FlowEdgeGeometry): FlowSegment[] => edgeSegmentsOf(edge, pan, zoom);

  return edges.flatMap(render);
};

/** How far along the dash period the flow has moved at `nowMs`, in px; it wraps every `cycleMs`. */
export const flowPhaseOf = (nowMs: number, cycleMs: number, periodPx: number): number => ((nowMs % cycleMs) / cycleMs) * periodPx;
