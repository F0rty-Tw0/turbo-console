import { describe, expect, it } from 'vitest';

import { nodeAt } from './graph-geometry.spec.util.ts';
import {
  lineMidpointOf,
  lineOf,
  lineThrough,
  midpointsUnderCountOf,
  startsOnNodeCountOf,
  throughNodeCountOf
} from './graph-lines.spec.util.ts';
import type { ProbeEdgeLine, ProbeNode } from '../../../src/graph/common/graph-probe.type.ts';

const ZOOM = 1;
const NO_INSET = 0;

/** A vertical line from a to b at x 100, y 0 to 200: its midpoint is (100, 100). */
const LINE: ProbeEdgeLine = lineThrough('a', 'b', [
  { x: 100, y: 0 },
  { x: 100, y: 200 }
]);
const HIDDEN_BASE: ProbeEdgeLine = lineThrough('c', 'd', []);
const HIDDEN_LINE: ProbeEdgeLine = { ...HIDDEN_BASE, isDrawn: false };

const MIDDLE_NODE: ProbeNode = nodeAt('mid', 100, 100);
const FILTERED_NODE: ProbeNode = { ...MIDDLE_NODE, isVisible: false };
const FOLDED_NODE: ProbeNode = { ...MIDDLE_NODE, isCollapsed: true };

/** The middle node's box runs from y 84 to 116; a line out of it starts on its bottom border, 1 px past it, or 120 px below. */
const START_SLACK_PX = 2;
const BORDER_START = { x: 100, y: 116 };
const FAR_END = { x: 100, y: 400 };
const FROM_BORDER: ProbeEdgeLine = lineThrough('mid', 'b', [BORDER_START, FAR_END]);
const FROM_PAST_BORDER: ProbeEdgeLine = lineThrough('mid', 'b', [{ x: 100, y: 117 }, FAR_END]);
const FROM_BELOW: ProbeEdgeLine = lineThrough('mid', 'b', [{ x: 100, y: 236 }, FAR_END]);
const FROM_OTHER_NODE: ProbeEdgeLine = lineThrough('a', 'b', [BORDER_START, FAR_END]);

describe('FEATURE: lineOf', () => {
  it('GIVEN drawn lines WHEN one is looked up by its ends THEN that line is returned', () => {
    const found = lineOf([HIDDEN_LINE, LINE], 'a', 'b');

    expect(found).toBe(LINE);
  });

  it('GIVEN a line that is not drawn WHEN it is looked up THEN it throws', () => {
    expect(() => lineOf([HIDDEN_LINE], 'c', 'd')).toThrow('the edge c>d is not drawn');
  });

  it('GIVEN a drawn line WHEN its midpoint is read THEN it is the line midpoint', () => {
    const midpoint = lineMidpointOf([LINE], 'a', 'b');

    expect(midpoint).toStrictEqual({ x: 100, y: 100 });
  });
});

describe('FEATURE: throughNodeCountOf', () => {
  it.each([
    { title: 'a drawn node on the line', nodes: [MIDDLE_NODE], expected: 1 },
    { title: 'a node hidden by a filter on the line', nodes: [FILTERED_NODE], expected: 0 },
    { title: 'a node inside a collapsed folder on the line', nodes: [FOLDED_NODE], expected: 0 }
  ])('GIVEN $title WHEN lines through nodes are counted THEN there are $expected', ({ nodes, expected }) => {
    const count = throughNodeCountOf([LINE], nodes, ZOOM, NO_INSET);

    expect(count).toBe(expected);
  });
});

describe('FEATURE: startsOnNodeCountOf', () => {
  it.each([
    { title: 'a line out of the node from its border', line: FROM_BORDER, expected: 1 },
    { title: 'a line out of the node from just past its border', line: FROM_PAST_BORDER, expected: 1 },
    { title: 'a line out of the node from 120 px below it', line: FROM_BELOW, expected: 0 },
    { title: 'a line out of another node from the border', line: FROM_OTHER_NODE, expected: 0 }
  ])('GIVEN $title WHEN lines starting on the node are counted THEN there are $expected', ({ line, expected }) => {
    const count = startsOnNodeCountOf([line], MIDDLE_NODE, ZOOM, START_SLACK_PX);

    expect(count).toBe(expected);
  });
});

describe('FEATURE: midpointsUnderCountOf', () => {
  it.each([
    { title: 'a drawn node under the midpoint', nodes: [MIDDLE_NODE], expected: 1 },
    { title: 'a node hidden by a filter under the midpoint', nodes: [FILTERED_NODE], expected: 0 },
    { title: 'a node inside a collapsed folder under the midpoint', nodes: [FOLDED_NODE], expected: 0 }
  ])('GIVEN $title WHEN midpoints under nodes are counted THEN there are $expected', ({ nodes, expected }) => {
    const count = midpointsUnderCountOf([LINE, HIDDEN_LINE], nodes, ZOOM);

    expect(count).toBe(expected);
  });
});
