import type { ElkEdge, ElkNode } from 'elkjs/lib/elk-api.js';

import type { Position } from '../../../bridge/common/graph-state.type.ts';
import { WRAPPER_ID_PREFIX } from '../../common/graph.const.ts';
import type { PlacedRect, Placement, Rect, Segment } from '../common/layout-quality.type.ts';

// The geometry of the U6c harness (`~/.cache/tc-u6c-plan/harness.mjs`), copied so `qualityOf` matches its table; nothing
// here reuses a production geometry util, so a production bug cannot hide in the oracle.

const ORIGIN: Position = { x: 0, y: 0 };

const childrenOf = (node: ElkNode): ElkNode[] => node.children ?? [];

const placementUnder = (node: ElkNode, origin: Position, ancestors: string[]): Placement => {
  const leaves: PlacedRect[] = [];
  const boxes: PlacedRect[] = [];

  for (const child of childrenOf(node)) {
    const x = origin.x + (child.x ?? 0);
    const y = origin.y + (child.y ?? 0);
    const rect: PlacedRect = { id: child.id, x1: x, y1: y, x2: x + (child.width ?? 0), y2: y + (child.height ?? 0), ancestors };
    const isWrapper = child.id.startsWith(WRAPPER_ID_PREFIX);
    const withChild = [...ancestors, child.id];
    const inner = isWrapper ? ancestors : withChild;
    const corner: Position = { x, y };
    const below = placementUnder(child, corner, inner);
    const isLeaf = childrenOf(child).length === 0;

    if (isLeaf) leaves.push(rect);
    else if (!isWrapper) boxes.push(rect);

    leaves.push(...below.leaves);
    boxes.push(...below.boxes);
  }

  const placement: Placement = { leaves, boxes };

  return placement;
};

/** Leaf and box rects in root coordinates, each with its ancestor boxes (`harness.mjs:30-47` `rectsOf`). */
export const placementOf = (laidOut: ElkNode): Placement => placementUnder(laidOut, ORIGIN, []);

/** The edges of `node` and of every node below it. */
export const edgesUnder = (node: ElkNode): ElkEdge[] => {
  const own = node.edges ?? [];
  const below = childrenOf(node).flatMap(edgesUnder);

  return [...own, ...below];
};

/** Whether a segment meets `rect` shrunk by `inset` on every side: Liang–Barsky (`harness.mjs:54-58` `segHits`). */
export const hits = (segment: Segment, rect: Rect, inset: number): boolean => {
  const [p, q] = segment;
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const clips: [number, number][] = [
    [-dx, p.x - (rect.x1 + inset)],
    [dx, rect.x2 - inset - p.x],
    [-dy, p.y - (rect.y1 + inset)],
    [dy, rect.y2 - inset - p.y]
  ];
  let enter = 0;
  let leave = 1;

  for (const [direction, room] of clips) {
    if (direction === 0 && room < 0) return false;

    if (direction === 0) continue;

    const ratio = room / direction;
    const isEntry = direction < 0;

    if (isEntry && ratio > leave) return false;

    if (!isEntry && ratio < enter) return false;

    if (isEntry) enter = Math.max(enter, ratio);
    else leave = Math.min(leave, ratio);
  }

  return true;
};

/** Strictly inside `rect` (`harness.mjs:59` `inside`). */
export const isInside = (point: Position, rect: Rect): boolean => {
  const inX = point.x > rect.x1 && point.x < rect.x2;

  return inX && point.y > rect.y1 && point.y < rect.y2;
};

const turnOf = (p: Position, q: Position, r: Position): number => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));

/** Whether two segments cross properly, a touch not counted (`harness.mjs:60-61` `segCross`). */
export const crosses = (left: Segment, right: Segment): boolean => {
  const [a, b] = left;
  const [c, d] = right;
  const splitsRight = turnOf(a, b, c) * turnOf(a, b, d) < 0;

  return splitsRight && turnOf(c, d, a) * turnOf(c, d, b) < 0;
};

/** The segments between consecutive points. */
export const segmentsOf = (points: Position[]): Segment[] => {
  const segmentTo = (end: Position, index: number): Segment => [points[index] ?? end, end];

  return points.slice(1).map(segmentTo);
};

const lengthOf = (segment: Segment): number => {
  const [p, q] = segment;

  return Math.hypot(q.x - p.x, q.y - p.y);
};

const sumOf = (total: number, value: number): number => total + value;

/** The point half way along the line, as Cytoscape draws a midpoint (`harness.mjs:93-95`); the first point for none. */
export const midpointOf = (points: Position[]): Position => {
  const segments = segmentsOf(points);
  const lengths = segments.map(lengthOf);
  let rest = lengths.reduce(sumOf, 0) / 2;

  for (const [index, [p, q]] of segments.entries()) {
    const length = lengths[index] ?? 0;

    if (rest <= length) {
      const share = rest / length;
      const ratio = length === 0 ? 0 : share;
      const point: Position = { x: p.x + (q.x - p.x) * ratio, y: p.y + (q.y - p.y) * ratio };

      return point;
    }

    rest -= length;
  }

  return points[0] ?? ORIGIN;
};
