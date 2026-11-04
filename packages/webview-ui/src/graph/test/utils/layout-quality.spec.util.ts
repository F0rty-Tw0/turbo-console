import type { ElkEdge, ElkNode } from 'elkjs/lib/elk-api.js';

import { boxOverlapOf, fitOf } from './layout-extent.spec.util.ts';
import { crosses, edgesUnder, hits, isInside, midpointOf, placementOf, segmentsOf, sumOf } from './layout-geometry.spec.util.ts';
import type { Position } from '../../../bridge/common/graph-state.type.ts';
import { FOLDER_PADDING_PX } from '../../common/graph.const.ts';
import type { DrawnLine, LayoutQuality, PlacedRect, Rect, Segment } from '../common/layout-quality.type.ts';
import type { U0Canvas } from '../common/u0-workspace.type.ts';

// The metrics of the U6c harness `score` (`~/.cache/tc-u6c-plan/harness.mjs:81-130`) on routed layouts. One difference: an
// edge ELK gave no route is counted in `edgeCount` but not drawn straight, so it adds to no other count; c6 fails on it.

type BoxCounts = Pick<LayoutQuality, 'overHeader' | 'ownHeader' | 'foreignBox'>;

const LEAF_INSET_PX = 2;

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
  const overHeader = foreign.filter(crossesBand).length;
  const ownHeader = own.filter(crossesBand).length;
  const foreignBox = foreign.filter(crossesBody).length;
  const counts: BoxCounts = { overHeader, ownHeader, foreignBox };

  return counts;
};

const sharesEnd = (left: DrawnLine, right: DrawnLine): boolean => isEnd(right, left.source) || isEnd(right, left.target);

const linesCross = (left: DrawnLine, right: DrawnLine): boolean => {
  const rightSegments = segmentsOf(right.points);
  const crossesRight = (segment: Segment): boolean => {
    const crossesSegment = (other: Segment): boolean => crosses(segment, other);

    return rightSegments.some(crossesSegment);
  };

  return segmentsOf(left.points).some(crossesRight);
};

/** Line pairs with no shared end that cross at least once (`harness.mjs:107-111`). */
const crossingsOf = (lines: DrawnLine[]): number => {
  let count = 0;

  for (const [index, left] of lines.entries()) {
    const later = lines.slice(index + 1);
    const crossesLeft = (right: DrawnLine): boolean => !sharesEnd(left, right) && linesCross(left, right);
    const crossed = later.filter(crossesLeft);

    count += crossed.length;
  }

  return count;
};

const totalOf = (lines: DrawnLine[], countOf: (line: DrawnLine) => number): number => {
  const counts = lines.map(countOf);

  return counts.reduce(sumOf, 0);
};

/** The box counts of every line, summed per field. */
const boxTotalsOf = (lines: DrawnLine[], boxes: PlacedRect[]): BoxCounts => {
  const countsOf = (line: DrawnLine): BoxCounts => boxCountsOf(line, boxes);
  const all = lines.map(countsOf);
  const overHeaders = all.map((counts) => counts.overHeader);
  const ownHeaders = all.map((counts) => counts.ownHeader);
  const foreignBoxes = all.map((counts) => counts.foreignBox);
  const totals: BoxCounts = {
    overHeader: overHeaders.reduce(sumOf, 0),
    ownHeader: ownHeaders.reduce(sumOf, 0),
    foreignBox: foreignBoxes.reduce(sumOf, 0)
  };

  return totals;
};

/** How readable `laidOut` (ELK's answer to `input`) is on `canvas`, scored like the U6c harness. */
export const qualityOf = (input: ElkNode, laidOut: ElkNode, canvas: U0Canvas): LayoutQuality => {
  const placement = placementOf(laidOut);
  const { leaves, boxes } = placement;
  const leafById = new Map(leaves.map((leaf) => [leaf.id, leaf]));
  const lines = linesOf(input, laidOut, leafById);
  const routed = lines.filter((line) => line.points.length > 0);
  const fit = fitOf(placement, routed, canvas);
  const boxTotals = boxTotalsOf(routed, boxes);
  const quality: LayoutQuality = {
    ...fit,
    ...boxTotals,
    routeCount: routed.length,
    edgeCount: lines.length,
    throughNode: totalOf(routed, (line) => throughCountOf(line, leaves)),
    midpointUnder: totalOf(routed, (line) => midpointCountOf(line, leaves)),
    crossings: crossingsOf(routed),
    boxOverlap: boxOverlapOf(boxes)
  };

  return quality;
};
