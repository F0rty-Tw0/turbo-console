import type { ElkEdge, ElkNode } from 'elkjs/lib/elk-api.js';

import { crosses, edgesUnder, hits, isInside, midpointOf, placementOf, segmentsOf } from './layout-geometry.spec.util.ts';
import type { Position } from '../../../bridge/common/graph-state.type.ts';
import { FOLDER_PADDING_PX } from '../../common/graph.const.ts';
import type { DrawnLine, LayoutQuality, PlacedRect, Placement, Rect } from '../common/layout-quality.type.ts';
import type { U0Canvas } from '../common/u0-workspace.type.ts';

// The metrics of the U6c harness `score` (`~/.cache/tc-u6c-plan/harness.mjs:81-130`) on routed layouts. One difference: an
// edge ELK gave no route is counted in `edgeCount` but not drawn straight, so it adds to no other count; c6 fails on it.

type BoxCounts = Pick<LayoutQuality, 'overHeader' | 'ownHeader' | 'foreignBox'>;

type Fit = Pick<LayoutQuality, 'fitZoom' | 'fitAspect'>;

const LEAF_INSET_PX = 2;
const BORDER_PX = 1.5;
const FIT_MARGIN_PX = 24;
const MAX_ZOOM = 2;

const routeOf = (edge: ElkEdge | undefined): Position[] => {
  const section = edge?.sections?.[0];

  if (section === undefined) return [];

  const bends = section.bendPoints ?? [];

  return [section.startPoint, ...bends, section.endPoint];
};

/** Each input edge between two leaves, drawn on the route its laid-out twin carries (`harness.mjs:64-79` `linesOf`). */
const linesOf = (input: ElkNode, laidOut: ElkNode, leafById: ReadonlyMap<string, PlacedRect>): DrawnLine[] => {
  const laidEdgeOf = new Map(edgesUnder(laidOut).map((edge) => [edge.id, edge]));
  const lineOf = (edge: ElkEdge): DrawnLine[] => {
    const source = leafById.get(edge.sources[0] ?? '');
    const target = leafById.get(edge.targets[0] ?? '');

    if (source === undefined || target === undefined) return [];

    const points = routeOf(laidEdgeOf.get(edge.id));
    const endBoxes = new Set([...source.ancestors, ...target.ancestors]);
    const line: DrawnLine = { source: source.id, target: target.id, points, endBoxes };

    return [line];
  };

  return edgesUnder(input).flatMap(lineOf);
};

const isEnd = (line: DrawnLine, id: string): boolean => id === line.source || id === line.target;

const meets = (line: DrawnLine, rect: Rect, inset: number): boolean => {
  const segments = segmentsOf(line.points);

  return segments.some((segment) => hits(segment, rect, inset));
};

const throughCountOf = (line: DrawnLine, leaves: PlacedRect[]): number => {
  const isCrossed = (leaf: PlacedRect): boolean => !isEnd(line, leaf.id) && meets(line, leaf, LEAF_INSET_PX);

  return leaves.filter(isCrossed).length;
};

const midpointCountOf = (line: DrawnLine, leaves: PlacedRect[]): number => {
  const midpoint = midpointOf(line.points);
  const covers = (leaf: PlacedRect): boolean => !isEnd(line, leaf.id) && isInside(midpoint, leaf);
  const isUnder = leaves.some(covers);

  return isUnder ? 1 : 0;
};

/** Title bands (the top `FOLDER_PADDING_PX`) and bodies crossed, own-ancestor bands apart (`harness.mjs:97-105`). */
const boxCountsOf = (line: DrawnLine, boxes: PlacedRect[]): BoxCounts => {
  const bandOf = (box: Rect): Rect => {
    const band: Rect = { ...box, y2: box.y1 + FOLDER_PADDING_PX };

    return band;
  };
  const crossesBand = (box: PlacedRect): boolean => meets(line, bandOf(box), 0);
  const crossesBody = (box: PlacedRect): boolean => meets(line, box, 0);
  const isOwn = (box: PlacedRect): boolean => line.endBoxes.has(box.id);
  const own = boxes.filter(isOwn);
  const foreign = boxes.filter((box) => !isOwn(box));
  const counts: BoxCounts = {
    overHeader: foreign.filter(crossesBand).length,
    ownHeader: own.filter(crossesBand).length,
    foreignBox: foreign.filter(crossesBody).length
  };

  return counts;
};

const sharesEnd = (left: DrawnLine, right: DrawnLine): boolean => isEnd(right, left.source) || isEnd(right, left.target);

const linesCross = (left: DrawnLine, right: DrawnLine): boolean => {
  const rightSegments = segmentsOf(right.points);

  return segmentsOf(left.points).some((segment) => rightSegments.some((other) => crosses(segment, other)));
};

/** Line pairs with no shared end that cross at least once (`harness.mjs:107-111`). */
const crossingsOf = (lines: DrawnLine[]): number => {
  let count = 0;

  for (const [index, left] of lines.entries()) {
    const later = lines.slice(index + 1);
    const crossed = later.filter((right) => !sharesEnd(left, right) && linesCross(left, right));

    count += crossed.length;
  }

  return count;
};

const grown = (box: PlacedRect): PlacedRect => {
  const drawn: PlacedRect = { ...box, x1: box.x1 - BORDER_PX, y1: box.y1 - BORDER_PX, x2: box.x2 + BORDER_PX, y2: box.y2 + BORDER_PX };

  return drawn;
};

const pointRectOf = (point: Position): Rect => {
  const rect: Rect = { x1: point.x, y1: point.y, x2: point.x, y2: point.y };

  return rect;
};

/** The fit zoom and aspect of leaves, drawn boxes (ELK rect plus border) and route points (`harness.mjs:112-121`). */
const fitOf = (placement: Placement, lines: DrawnLine[], canvas: U0Canvas): Fit => {
  const points = lines.flatMap((line) => line.points).map(pointRectOf);
  const drawnBoxes = placement.boxes.map(grown);
  const rects = [...placement.leaves, ...drawnBoxes, ...points];
  const lefts = rects.map((rect) => rect.x1);
  const rights = rects.map((rect) => rect.x2);
  const tops = rects.map((rect) => rect.y1);
  const bottoms = rects.map((rect) => rect.y2);
  const width = Math.max(...rights) - Math.min(...lefts);
  const height = Math.max(...bottoms) - Math.min(...tops);
  const zoomX = (canvas.width - 2 * FIT_MARGIN_PX) / width;
  const zoomY = (canvas.height - 2 * FIT_MARGIN_PX) / height;
  const fit: Fit = { fitZoom: Math.min(zoomX, zoomY, MAX_ZOOM), fitAspect: width / height };

  return fit;
};

const overlaps = (left: PlacedRect, right: PlacedRect): boolean => {
  const isNested = left.ancestors.includes(right.id) || right.ancestors.includes(left.id);
  const meetX = left.x1 < right.x2 && right.x1 < left.x2;

  return !isNested && meetX && left.y1 < right.y2 && right.y1 < left.y2;
};

/** Pairs of drawn boxes, neither inside the other, that overlap (`harness.mjs:127`). */
const boxOverlapOf = (boxes: PlacedRect[]): number => {
  const drawn = boxes.map(grown);
  const overlapsLater = (box: PlacedRect, index: number): number =>
    drawn.slice(index + 1).filter((other) => overlaps(box, other)).length;

  return drawn.map(overlapsLater).reduce((total, count) => total + count, 0);
};

const totalOf = (lines: DrawnLine[], countOf: (line: DrawnLine) => number): number =>
  lines.map(countOf).reduce((total, count) => total + count, 0);

/** How readable `laidOut` (ELK's answer to `input`) is on `canvas`, scored like the U6c harness. */
export const qualityOf = (input: ElkNode, laidOut: ElkNode, canvas: U0Canvas): LayoutQuality => {
  const placement = placementOf(laidOut);
  const { leaves, boxes } = placement;
  const leafById = new Map(leaves.map((leaf) => [leaf.id, leaf]));
  const lines = linesOf(input, laidOut, leafById);
  const routed = lines.filter((line) => line.points.length > 0);
  const fit = fitOf(placement, routed, canvas);
  const quality: LayoutQuality = {
    ...fit,
    routeCount: routed.length,
    edgeCount: lines.length,
    throughNode: totalOf(routed, (line) => throughCountOf(line, leaves)),
    midpointUnder: totalOf(routed, (line) => midpointCountOf(line, leaves)),
    crossings: crossingsOf(routed),
    overHeader: totalOf(routed, (line) => boxCountsOf(line, boxes).overHeader),
    ownHeader: totalOf(routed, (line) => boxCountsOf(line, boxes).ownHeader),
    foreignBox: totalOf(routed, (line) => boxCountsOf(line, boxes).foreignBox),
    boxOverlap: boxOverlapOf(boxes)
  };

  return quality;
};
