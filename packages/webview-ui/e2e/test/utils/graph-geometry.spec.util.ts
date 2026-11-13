import { isInside } from './element-rect.spec.util.ts';
import type { ProbeEdgeLine, ProbeNode } from '../../../src/graph/common/graph-probe.type.ts';
import { EDGE_CLEARANCE_PX } from '../../common/graph.const.ts';
import type { ElementRect, LinkEnds, ViewportPoint } from '../../common/playwright.type.ts';

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

/** Per node: its box at `zoom` lies wholly inside the container. */
export const insideFlagsOf = (container: ElementRect, nodes: ProbeNode[], zoom: number): boolean[] => {
  const isNodeInside = (node: ProbeNode): boolean => isInside(nodeBoxOf(node, zoom), container);

  return nodes.map(isNodeInside);
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
    text: id,
    textMaxWidth: 0,
    fill: '',
    isGhost: false,
    borderStyle: 'solid',
    effectiveOpacity: 1,
    isVisible: true,
    isCollapsed: false,
    outlineWidth: 0,
    outlineColor: '',
    accentColor: null,
    underlayColor: '',
    underlayOpacity: 0
  };

  return node;
};

const isInsideBox = (point: ViewportPoint, box: ElementRect): boolean => {
  const isAcross = point.x >= box.left && point.x <= box.left + box.width;
  const isDown = point.y >= box.top && point.y <= box.top + box.height;

  return isAcross && isDown;
};

/** The distance from `point` to the segment `from`-`to`. */
export const segmentDistanceOf = (point: ViewportPoint, from: ViewportPoint, to: ViewportPoint): number => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  const along = ((point.x - from.x) * dx + (point.y - from.y) * dy) / (lengthSquared || 1);
  const clamped = Math.min(1, Math.max(0, along));

  return Math.hypot(point.x - (from.x + clamped * dx), point.y - (from.y + clamped * dy));
};

/** The straight pieces of a drawn line, one per pair of neighbouring points; none while the line is not drawn. */
export const lineSegmentsOf = (line: ProbeEdgeLine): LinkEnds[] => {
  const segmentFrom = (from: ViewportPoint, index: number): LinkEnds => {
    const to = line.points[index + 1] ?? from;
    const segment: LinkEnds = { from, to };

    return segment;
  };

  return line.points.slice(0, -1).map(segmentFrom);
};

const isClearOfLine = (point: ViewportPoint, line: ProbeEdgeLine): boolean => {
  const isFar = (segment: LinkEnds): boolean => segmentDistanceOf(point, segment.from, segment.to) > EDGE_CLEARANCE_PX;

  return lineSegmentsOf(line).every(isFar);
};

const isClearOfLines = (point: ViewportPoint, lines: ProbeEdgeLine[]): boolean => {
  const isClear = (line: ProbeEdgeLine): boolean => isClearOfLine(point, line);

  return lines.every(isClear);
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

const BOX_GROWTH = 2;

const isPointInGrownBox = (point: ViewportPoint, box: ElementRect): boolean => {
  const grown: ElementRect = {
    left: box.left - BOX_GROWTH,
    top: box.top - BOX_GROWTH,
    width: box.width + 2 * BOX_GROWTH,
    height: box.height + 2 * BOX_GROWTH
  };

  return isInsideBox(point, grown);
};

/**
 * The first of the container's four inset corners, then its four side midpoints, that lies outside every node box grown
 * by 2 px, since a tap on a node's border still hits it, and farther than `EDGE_CLEARANCE_PX` from every drawn line (its
 * bends included); throws when none does.
 */
export const emptySpotOf = (container: ElementRect, nodes: ProbeNode[], lines: ProbeEdgeLine[], zoom: number): ViewportPoint => {
  const boxes = nodes.map((node): ElementRect => nodeBoxOf(node, zoom));
  const isEmpty = (point: ViewportPoint): boolean => {
    const isOutsideNodes = !boxes.some((box): boolean => isPointInGrownBox(point, box));
    const isOutsideLines = isClearOfLines(point, lines);

    return isOutsideNodes && isOutsideLines;
  };
  const spot = candidatesOf(container).find(isEmpty);

  if (spot === undefined) throw new Error('graph e2e: every container corner and side is covered by a node or an edge');

  return spot;
};

const GRID_STEP = 20;

const GRID_EDGE_INSET = 2;

/** `start`, `start + step`, ... while below `limit`. */
const stepsOf = (start: number, limit: number): number[] => {
  const count = Math.max(0, Math.ceil((limit - start) / GRID_STEP));
  const slots = Array.from({ length: count });

  return Array.from(slots.keys(), (index): number => start + index * GRID_STEP);
};

/**
 * The first point of a 20 px grid over the container, 2 px in from each edge, that no box rect (grown by 2 px) holds
 * and that is farther than `EDGE_CLEARANCE_PX` from every drawn line; throws when none does.
 */
export const freeSpotOf = (container: ElementRect, boxes: ElementRect[], lines: ProbeEdgeLine[]): ViewportPoint => {
  const rows = stepsOf(container.top + GRID_EDGE_INSET, container.top + container.height - GRID_EDGE_INSET);
  const columns = stepsOf(container.left + GRID_EDGE_INSET, container.left + container.width - GRID_EDGE_INSET);
  const pointAt = (y: number, x: number): ViewportPoint => {
    const point: ViewportPoint = { x, y };

    return point;
  };
  const points = rows.flatMap((y): ViewportPoint[] => columns.map((x): ViewportPoint => pointAt(y, x)));
  const isFree = (point: ViewportPoint): boolean => {
    const isOutsideBoxes = !boxes.some((box): boolean => isPointInGrownBox(point, box));

    return isOutsideBoxes && isClearOfLines(point, lines);
  };
  const spot = points.find(isFree);

  if (spot === undefined) throw new Error('graph e2e: every grid point of the container lies inside a folder box or on a line');

  return spot;
};
