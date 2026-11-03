import { describe, expect, it } from 'vitest';

import { edgeLineOf } from './graph-probe-lines.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import { ROUTED_CLASS } from '../common/graph-layout.const.ts';
import type { ProbeEdgeLine, ProbeLineEnd, ProbeLineSource } from '../common/graph-probe.type.ts';

const START: Position = { x: 10, y: 20 };

const BEND_ONE: Position = { x: 10, y: 60 };

const BEND_TWO: Position = { x: 50, y: 60 };

const END: Position = { x: 50, y: 100 };

const MIDDLE: Position = { x: 30, y: 60 };

/** The zoom and the offset a page at (100, 50) panned by (10, 20) reads with. */
const ZOOM = 2;

const OFFSET: Position = { x: 110, y: 70 };

const A_END: ProbeLineEnd = { id: (): string => 'a' };

const B_END: ProbeLineEnd = { id: (): string => 'b' };

const MIDDLE_RENDERED: Position = { x: 170, y: 190 };

type SourceFacts = {
  readonly isRouted: boolean;
  readonly isVisible: boolean;
  readonly segments: Position[] | undefined;
  readonly controls: Position[] | undefined;
};

const ROUTED_FACTS: SourceFacts = { isRouted: true, isVisible: true, segments: [BEND_ONE, BEND_TWO], controls: undefined };

const sourceOf = (facts: SourceFacts): ProbeLineSource => {
  const source: ProbeLineSource = {
    source: (): ProbeLineEnd => A_END,
    target: (): ProbeLineEnd => B_END,
    visible: (): boolean => facts.isVisible,
    hasClass: (name: string): boolean => facts.isRouted && name === ROUTED_CLASS,
    sourceEndpoint: (): Position => START,
    targetEndpoint: (): Position => END,
    segmentPoints: (): Position[] | undefined => facts.segments,
    controlPoints: (): Position[] | undefined => facts.controls,
    midpoint: (): Position => MIDDLE
  };

  return source;
};

const renderedOf = (point: Position): Position => {
  const rendered: Position = { x: point.x * ZOOM + OFFSET.x, y: point.y * ZOOM + OFFSET.y };

  return rendered;
};

describe('FEATURE: edgeLineOf', () => {
  describe('GIVEN a routed edge', () => {
    it('WHEN read THEN points are start, the segment points and the end, in rendered px', () => {
      const line = edgeLineOf(sourceOf(ROUTED_FACTS), ZOOM, OFFSET);

      expect(line.points).toStrictEqual([
        { x: 130, y: 110 },
        { x: 130, y: 190 },
        { x: 210, y: 190 },
        { x: 210, y: 270 }
      ]);
    });

    it('WHEN read THEN it names its ends, says it is routed and drawn, and puts the midpoint in rendered px', () => {
      const line = edgeLineOf(sourceOf(ROUTED_FACTS), ZOOM, OFFSET);

      expect(line).toMatchObject({ source: 'a', target: 'b', isRouted: true, isDrawn: true, midpoint: MIDDLE_RENDERED });
    });
  });

  describe('GIVEN an unrouted edge with no control points', () => {
    it('WHEN read THEN points are start and end only', () => {
      const line = edgeLineOf(sourceOf({ ...ROUTED_FACTS, isRouted: false, segments: undefined }), ZOOM, OFFSET);

      expect(line.points).toStrictEqual([renderedOf(START), renderedOf(END)]);
    });
  });

  describe('GIVEN an unrouted bezier edge', () => {
    it('WHEN read THEN its control point sits between the ends', () => {
      const control: Position = { x: 20, y: 40 };
      const line = edgeLineOf(sourceOf({ ...ROUTED_FACTS, isRouted: false, controls: [control] }), ZOOM, OFFSET);

      expect(line.points).toStrictEqual([renderedOf(START), renderedOf(control), renderedOf(END)]);
    });
  });

  describe('GIVEN an edge Cytoscape does not draw', () => {
    it('WHEN read THEN it is not drawn and has no points', () => {
      const line: ProbeEdgeLine = edgeLineOf(sourceOf({ ...ROUTED_FACTS, isVisible: false }), ZOOM, OFFSET);

      expect(line).toMatchObject({ isDrawn: false, points: [] });
    });
  });
});
