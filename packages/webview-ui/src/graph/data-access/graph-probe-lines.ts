import type { Core } from 'cytoscape';

import { packageEdges } from './graph-boxes.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import { ROUTED_CLASS } from '../common/graph-layout.const.ts';
import type { ProbeEdgeLine, ProbeLineSource } from '../common/graph-probe.type.ts';

const ORIGIN: Position = { x: 0, y: 0 };

const renderedOf = (point: Position, zoom: number, offset: Position): Position => {
  const rendered: Position = { x: point.x * zoom + offset.x, y: point.y * zoom + offset.y };

  return rendered;
};

const bendsOf = (edge: ProbeLineSource, isRouted: boolean): Position[] => {
  if (isRouted) return edge.segmentPoints() ?? [];

  return edge.controlPoints() ?? [];
};

/** The model points of the drawn path: the source end, the bends, the target end. */
const pathOf = (edge: ProbeLineSource, isRouted: boolean): Position[] => {
  const bends = bendsOf(edge, isRouted);
  const path = [edge.sourceEndpoint(), ...bends, edge.targetEndpoint()];

  return path;
};

const hiddenLineOf = (edge: ProbeLineSource, isRouted: boolean): ProbeEdgeLine => {
  const source = edge.source().id();
  const target = edge.target().id();
  const line: ProbeEdgeLine = { source, target, isRouted, isDrawn: false, points: [], midpoint: ORIGIN };

  return line;
};

/** `edge`'s line in page pixels: each model point `p` is read at `p · zoom + offset`, `offset` being the container's corner plus the pan. */
export const edgeLineOf = (edge: ProbeLineSource, zoom: number, offset: Position): ProbeEdgeLine => {
  const isRouted = edge.hasClass(ROUTED_CLASS);

  const isDrawn = edge.visible();

  if (!isDrawn) return hiddenLineOf(edge, isRouted);

  const toRendered = (point: Position): Position => renderedOf(point, zoom, offset);
  const points = pathOf(edge, isRouted).map(toRendered);
  const midpoint = toRendered(edge.midpoint());
  const source = edge.source().id();
  const target = edge.target().id();
  const line: ProbeEdgeLine = { source, target, isRouted, isDrawn: true, points, midpoint };

  return line;
};

/** Every package edge's line; `origin` is the container's top left corner in the page. */
export const edgeLinesOf = (cy: Core, origin: Position): ProbeEdgeLine[] => {
  const pan = cy.pan();
  const offset: Position = { x: origin.x + pan.x, y: origin.y + pan.y };
  const zoom = cy.zoom();
  const lineOf = (edge: ProbeLineSource): ProbeEdgeLine => edgeLineOf(edge, zoom, offset);

  return packageEdges(cy).map(lineOf);
};
