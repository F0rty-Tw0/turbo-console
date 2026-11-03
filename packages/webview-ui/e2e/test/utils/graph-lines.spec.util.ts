/* eslint-disable no-underscore-dangle -- the page exposes the probe as window.__tcGraphProbe */
import type { Page } from '@playwright/test';

import { isInside, pointBoxOf } from './element-rect.spec.util.ts';
import { emptySpotOf, lineSegmentsOf, nodeBoxOf } from './graph-geometry.spec.util.ts';
import type { ProbeEdgeLine, ProbeNode } from '../../../src/graph/common/graph-probe.type.ts';
import type { ElementRect, LinkEnds, ViewportPoint } from '../../common/playwright.type.ts';

/** Where Liang-Barsky has clipped a segment so far: the share of it inside the box runs from `enter` to `leave`. */
type Clip = {
  readonly enter: number;
  readonly leave: number;
  readonly isOutside: boolean;
};

/** One side of the box: the segment moves `step` toward it per unit of its length, `room` away from the side. */
type BoxSide = {
  readonly step: number;
  readonly room: number;
};

const WHOLE_SEGMENT: Clip = { enter: 0, leave: 1, isOutside: false };

/** The drawn lines the probe reports, in page pixels; runs in the page through `evaluate`. */
export const readEdgeLines = async (page: Page): Promise<ProbeEdgeLine[]> =>
  page.evaluate((): ProbeEdgeLine[] => window.__tcGraphProbe?.edgeLines() ?? []);

/** The first empty corner or side of the container, off every node and every line the page draws now. */
export const emptySpotOn = async (page: Page, container: ElementRect, nodes: ProbeNode[], zoom: number): Promise<ViewportPoint> => {
  const lines = await readEdgeLines(page);

  return emptySpotOf(container, nodes, lines, zoom);
};

const NOWHERE: ViewportPoint = { x: 0, y: 0 };

/** A line the probe would report from `source` to `target` through `points`, its midpoint in the middle of the first piece. */
export const lineThrough = (source: string, target: string, points: ViewportPoint[]): ProbeEdgeLine => {
  const [from = NOWHERE, to = from] = points;
  const midpoint: ViewportPoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const line: ProbeEdgeLine = { source, target, isRouted: points.length > 2, isDrawn: true, points, midpoint };

  return line;
};

/** The midpoint of the drawn line from `source` to `target`, which lies on its path; throws when no such line is drawn. */
export const lineMidpointOf = (lines: ProbeEdgeLine[], source: string, target: string): ViewportPoint => {
  const isEdge = (line: ProbeEdgeLine): boolean => line.source === source && line.target === target && line.isDrawn;
  const line = lines.find(isEdge);

  if (line === undefined) throw new Error(`graph e2e: the edge ${source}>${target} is not drawn`);

  return line.midpoint;
};

/** `line` lies wholly inside `container`, bends included; a line that is not drawn has no point to fall outside. */
export const isLineInside = (line: ProbeEdgeLine, container: ElementRect): boolean => {
  const isPointInside = (point: ViewportPoint): boolean => isInside(pointBoxOf(point), container);

  return line.points.every(isPointInside);
};

const clipAgainst = (clip: Clip, side: BoxSide): Clip => {
  const reach = side.room / side.step;
  const isParallel = side.step === 0;
  const isEntering = side.step < 0;
  const parallel: Clip = { ...clip, isOutside: clip.isOutside || side.room < 0 };
  const entered: Clip = { ...clip, enter: Math.max(clip.enter, reach) };
  const left: Clip = { ...clip, leave: Math.min(clip.leave, reach) };

  if (isParallel) return parallel;

  if (isEntering) return entered;

  return left;
};

const sidesOf = (segment: LinkEnds, box: ElementRect): BoxSide[] => {
  const { from, to } = segment;
  const sides: BoxSide[] = [
    { step: from.x - to.x, room: from.x - box.left },
    { step: to.x - from.x, room: box.left + box.width - from.x },
    { step: from.y - to.y, room: from.y - box.top },
    { step: to.y - from.y, room: box.top + box.height - from.y }
  ];

  return sides;
};

const crossesBox = (segment: LinkEnds, box: ElementRect): boolean => {
  const clip = sidesOf(segment, box).reduce(clipAgainst, WHOLE_SEGMENT);

  return !clip.isOutside && clip.enter <= clip.leave;
};

const shrunkBy = (box: ElementRect, insetPx: number): ElementRect => {
  const shrunk: ElementRect = {
    left: box.left + insetPx,
    top: box.top + insetPx,
    width: Math.max(0, box.width - 2 * insetPx),
    height: Math.max(0, box.height - 2 * insetPx)
  };

  return shrunk;
};

const isEndOf = (line: ProbeEdgeLine, node: ProbeNode): boolean => line.source === node.id || line.target === node.id;

const passesThrough = (line: ProbeEdgeLine, node: ProbeNode, zoom: number, insetPx: number): boolean => {
  const box = shrunkBy(nodeBoxOf(node, zoom), insetPx);
  const crosses = (segment: LinkEnds): boolean => crossesBox(segment, box);

  return !isEndOf(line, node) && lineSegmentsOf(line).some(crosses);
};

/** How many pairs of a drawn line and a node that is not one of its ends have the line cross the node's box shrunk by `insetPx`. */
export const throughNodeCountOf = (lines: ProbeEdgeLine[], nodes: ProbeNode[], zoom: number, insetPx: number): number => {
  const pairsOf = (line: ProbeEdgeLine): ProbeNode[] => nodes.filter((node): boolean => passesThrough(line, node, zoom, insetPx));

  return lines.flatMap(pairsOf).length;
};

/** How many drawn lines have their midpoint under a node's box. */
export const midpointsUnderCountOf = (lines: ProbeEdgeLine[], nodes: ProbeNode[], zoom: number): number => {
  const boxes = nodes.map((node): ElementRect => nodeBoxOf(node, zoom));
  const isUnder = (line: ProbeEdgeLine): boolean =>
    line.isDrawn && boxes.some((box): boolean => isInside(pointBoxOf(line.midpoint), box));

  return lines.filter(isUnder).length;
};
