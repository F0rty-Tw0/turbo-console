import { describe, expect, it } from 'vitest';

import { edgeSampleOf } from './graph-flow-samples.spec.util.ts';
import { lineSegmentsOf, segmentDistanceOf } from './graph-geometry.spec.util.ts';
import { lineThrough } from './graph-lines.spec.util.ts';
import type { ProbeEdgeLine } from '../../../src/graph/common/graph-probe.type.ts';
import type { EdgeSample } from '../../common/graph-flow.type.ts';
import type { LinkEnds, ViewportPoint } from '../../common/playwright.type.ts';

const STRAIGHT: ProbeEdgeLine = lineThrough('a', 'b', [
  { x: 100, y: 100 },
  { x: 100, y: 200 }
]);

/** One bend, so Cytoscape puts the midpoint on the corner. */
const ELBOW_POINTS: ViewportPoint[] = [
  { x: 100, y: 100 },
  { x: 140, y: 100 },
  { x: 140, y: 160 }
];
const ELBOW_CORNER: ViewportPoint = { x: 140, y: 100 };
const ELBOW_BASE: ProbeEdgeLine = lineThrough('a', 'b', ELBOW_POINTS);
const ELBOW: ProbeEdgeLine = { ...ELBOW_BASE, midpoint: ELBOW_CORNER };

const OFF_LINE_PX = 0.5;

const distanceFromLine = (line: ProbeEdgeLine, sample: EdgeSample, point: ViewportPoint): number => {
  const onPage: ViewportPoint = { x: point.x + sample.clip.x, y: point.y + sample.clip.y };
  const gapTo = (piece: LinkEnds): number => segmentDistanceOf(onPage, piece.from, piece.to);
  const gaps = lineSegmentsOf(line).map(gapTo);

  return Math.min(...gaps);
};

describe('FEATURE: edgeSampleOf', () => {
  describe('GIVEN a straight line', () => {
    it('WHEN sampled THEN the 13 points lie on the line', () => {
      const sample = edgeSampleOf(STRAIGHT);
      const gaps = sample.points.map((point): number => distanceFromLine(STRAIGHT, sample, point));

      expect(sample.points).toHaveLength(13);
      expect(Math.max(...gaps)).toBeLessThan(OFF_LINE_PX);
    });
  });

  describe('GIVEN a line with one bend whose midpoint is the corner', () => {
    it('WHEN sampled THEN the 13 points lie on the line, none past the corner', () => {
      const sample = edgeSampleOf(ELBOW);
      const gaps = sample.points.map((point): number => distanceFromLine(ELBOW, sample, point));

      expect(Math.max(...gaps)).toBeLessThan(OFF_LINE_PX);
    });
  });
});
