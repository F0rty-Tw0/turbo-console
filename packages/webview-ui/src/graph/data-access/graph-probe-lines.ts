import type { Core, EdgeCollection } from 'cytoscape';

import { packageEdges } from './graph-boxes.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import { ROUTED_CLASS } from '../common/graph-layout.const.ts';
import type { ProbeLineSource } from '../common/graph-probe-line-source.type.ts';
import type { ProbeEdgeLine } from '../common/graph-probe.type.ts';
import { FOLDER_LINK_CLASS } from '../common/graph.const.ts';
import { drawnBendsOf } from '../utils/drawn-bends.util.ts';

const ORIGIN: Position = { x: 0, y: 0 };

const renderedOf = (point: Position, zoom: number, offset: Position): Position => {
  const rendered: Position = { x: point.x * zoom + offset.x, y: point.y * zoom + offset.y };

  return rendered;
};

/** The model points of the drawn path: the source end, the bends, the target end. */
const pathOf = (edge: ProbeLineSource): Position[] => {
  const bends = drawnBendsOf(edge);
  const path = [edge.sourceEndpoint(), ...bends, edge.targetEndpoint()];

  return path;
};

const hiddenLineOf = (source: string, target: string, isRouted: boolean): ProbeEdgeLine => {
  const line: ProbeEdgeLine = { source, target, isRouted, isDrawn: false, points: [], midpoint: ORIGIN };

  return line;
};

/** `edge`'s line in page pixels: each model point `p` is read at `p · zoom + offset`, `offset` being the container's corner plus the pan. */
export const edgeLineOf = (edge: ProbeLineSource, zoom: number, offset: Position): ProbeEdgeLine => {
  const source = edge.source().id();
  const target = edge.target().id();
  const isRouted = edge.hasClass(ROUTED_CLASS);
  const isDrawn = edge.visible();

  if (!isDrawn) return hiddenLineOf(source, target, isRouted);

  const toRendered = (point: Position): Position => renderedOf(point, zoom, offset);
  const points = pathOf(edge).map(toRendered);
  const midpoint = toRendered(edge.midpoint());
  const line: ProbeEdgeLine = { source, target, isRouted, isDrawn: true, points, midpoint };

  return line;
};

const linesOf = (cy: Core, edges: EdgeCollection, origin: Position): ProbeEdgeLine[] => {
  const pan = cy.pan();
  const offset: Position = { x: origin.x + pan.x, y: origin.y + pan.y };
  const zoom = cy.zoom();
  const lineOf = (edge: ProbeLineSource): ProbeEdgeLine => edgeLineOf(edge, zoom, offset);

  return edges.map(lineOf);
};

/** Every drawn edge's line, package or task link; `origin` is the container's top left corner in the page. */
export const edgeLinesOf = (cy: Core, origin: Position): ProbeEdgeLine[] => linesOf(cy, packageEdges(cy), origin);

/** Every folder link's line in `cy.edges()` order, which is the order `folderLinks()` lists them; a link Cytoscape does not draw reads as not drawn. */
export const folderLinkLinesOf = (cy: Core, origin: Position): ProbeEdgeLine[] => {
  const links = cy.edges(`.${FOLDER_LINK_CLASS}`);

  return linesOf(cy, links, origin);
};
