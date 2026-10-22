import type { ProbeEdge, ProbeNode } from '../../../src/graph/common/graph-probe.type.ts';
import { EDGE_CLEARANCE_PX } from '../../common/graph.const.ts';
import type { ElementRect, ViewportPoint } from '../../common/playwright.type.ts';

const CORNER_INSET = 12;

const STUB_NODE_WIDTH = 60;

const STUB_NODE_HEIGHT = 32;

/** A node's box in page pixels at `zoom`, from its rendered centre. */
export const nodeBoxOf = (node: ProbeNode, zoom: number): ElementRect => {
  const width = node.width * zoom;
  const height = node.height * zoom;
  const box: ElementRect = { left: node.renderedX - width / 2, top: node.renderedY - height / 2, width, height };

  return box;
};

/** A plain node the probe would report at the rendered centre `(renderedX, renderedY)`. */
export const nodeAt = (id: string, renderedX: number, renderedY: number): ProbeNode => {
  const node: ProbeNode = {
    id,
    x: renderedX,
    y: renderedY,
    renderedX,
    renderedY,
    width: STUB_NODE_WIDTH,
    height: STUB_NODE_HEIGHT,
    state: 'normal',
    frame: '',
    label: '',
    fill: '',
    isGhost: false,
    borderStyle: 'solid'
  };

  return node;
};

const isInsideBox = (point: ViewportPoint, box: ElementRect): boolean => {
  const isAcross = point.x >= box.left && point.x <= box.left + box.width;
  const isDown = point.y >= box.top && point.y <= box.top + box.height;

  return isAcross && isDown;
};

const centreOf = (node: ProbeNode): ViewportPoint => {
  const centre: ViewportPoint = { x: node.renderedX, y: node.renderedY };

  return centre;
};

const nodeNamed = (nodes: ProbeNode[], id: string): ProbeNode | undefined => nodes.find((node): boolean => node.id === id);

/** The distance from `point` to the segment `from`-`to`. */
export const segmentDistanceOf = (point: ViewportPoint, from: ViewportPoint, to: ViewportPoint): number => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  const along = ((point.x - from.x) * dx + (point.y - from.y) * dy) / (lengthSquared || 1);
  const clamped = Math.min(1, Math.max(0, along));

  return Math.hypot(point.x - (from.x + clamped * dx), point.y - (from.y + clamped * dy));
};

/** The midpoint of the two rendered centres of an edge; throws when either end is not drawn. */
export const edgeMidpointOf = (nodes: ProbeNode[], source: string, target: string): ViewportPoint => {
  const from = nodeNamed(nodes, source);
  const to = nodeNamed(nodes, target);

  if (from === undefined || to === undefined) throw new Error(`graph e2e: the edge ${source}>${target} has an end that is not drawn`);

  const midpoint: ViewportPoint = { x: (from.renderedX + to.renderedX) / 2, y: (from.renderedY + to.renderedY) / 2 };

  return midpoint;
};

/** The two rendered centres of a drawn edge whose ends the probe lists; `null` for an edge nobody can tap. */
const segmentOf = (nodes: ProbeNode[], edge: ProbeEdge): ViewportPoint[] | null => {
  const from = nodeNamed(nodes, edge.source);
  const to = nodeNamed(nodes, edge.target);

  if (!edge.isDrawn || from === undefined || to === undefined) return null;

  return [centreOf(from), centreOf(to)];
};

const isClearOfSegment = (point: ViewportPoint, segment: ViewportPoint[] | null): boolean => {
  const [from, to] = segment ?? [];

  if (from === undefined || to === undefined) return true;

  return segmentDistanceOf(point, from, to) > EDGE_CLEARANCE_PX;
};

/** The container's four inset corners, then its four side midpoints. */
const candidatesOf = (container: ElementRect): ViewportPoint[] => {
  const left = container.left + CORNER_INSET;
  const top = container.top + CORNER_INSET;
  const right = container.left + container.width - CORNER_INSET;
  const bottom = container.top + container.height - CORNER_INSET;
  const middleX = container.left + container.width / 2;
  const middleY = container.top + container.height / 2;
  const candidates: ViewportPoint[] = [
    { x: left, y: top },
    { x: right, y: top },
    { x: left, y: bottom },
    { x: right, y: bottom },
    { x: middleX, y: top },
    { x: middleX, y: bottom },
    { x: left, y: middleY },
    { x: right, y: middleY }
  ];

  return candidates;
};

/**
 * The first of the container's four inset corners, then its four side midpoints, that lies outside every node box and
 * farther than `EDGE_CLEARANCE_PX` from every drawn edge segment; throws when none does.
 */
export const emptySpotOf = (container: ElementRect, nodes: ProbeNode[], edges: ProbeEdge[], zoom: number): ViewportPoint => {
  const boxes = nodes.map((node): ElementRect => nodeBoxOf(node, zoom));
  const segments = edges.map((edge): ViewportPoint[] | null => segmentOf(nodes, edge));
  const isEmpty = (point: ViewportPoint): boolean => {
    const isOutsideNodes = !boxes.some((box): boolean => isInsideBox(point, box));
    const isOutsideEdges = segments.every((segment): boolean => isClearOfSegment(point, segment));

    return isOutsideNodes && isOutsideEdges;
  };
  const spot = candidatesOf(container).find(isEmpty);

  if (spot === undefined) throw new Error('graph e2e: every container corner and side is covered by a node or an edge');

  return spot;
};
