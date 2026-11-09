import { describe, expect, it } from 'vitest';

import { nodeAt } from './graph-geometry.spec.util.ts';
import { lineThrough } from './graph-lines.spec.util.ts';
import { bendShiftOf, routeBendsOf } from './graph-route-bends.spec.util.ts';
import type { Position } from '../../../src/bridge/common/graph-state.type.ts';
import type { ProbeEdgeLine, ProbeNode } from '../../../src/graph/common/graph-probe.type.ts';
import type { RouteBends, RouteRead } from '../../common/graph-route.type.ts';

const UMBRELLA = 'pkg:atoms';

const umbrellaAt = (renderedX: number, renderedY: number): ProbeNode => {
  const plain = nodeAt(UMBRELLA, renderedX, renderedY);
  const umbrella: ProbeNode = { ...plain, width: 100, height: 40 };

  return umbrella;
};

const readOf = (nodes: ProbeNode[], lines: ProbeEdgeLine[], zoom: number): RouteRead => {
  const read: RouteRead = { lines, nodes, zoom };

  return read;
};

const routeOf = (bend: Position, withApi = true): RouteBends => {
  const bends = [bend];
  const both: RouteBends = { web: bends, api: [] };
  const webOnly: RouteBends = { web: bends };
  const route = withApi ? both : webOnly;

  return route;
};

describe('FEATURE: routeBendsOf', () => {
  const line = lineThrough(UMBRELLA, 'web', [
    { x: 0, y: 0 },
    { x: 250, y: 120 },
    { x: 300, y: 100 }
  ]);

  it('GIVEN a line with one bend WHEN it is read at zoom 1 THEN the bend is its offset from the umbrella centre in umbrella sizes', () => {
    const bends = routeBendsOf(readOf([umbrellaAt(200, 100)], [line], 1), UMBRELLA);
    const expected = routeOf({ x: 0.5, y: 0.5 }, false);

    expect(bends).toStrictEqual(expected);
  });

  it('GIVEN the same route at zoom 2, panned WHEN it is read THEN the fractions are the same', () => {
    const zoomed = lineThrough(UMBRELLA, 'web', [
      { x: 10, y: 20 },
      { x: 330, y: 170 },
      { x: 410, y: 150 }
    ]);
    const bends = routeBendsOf(readOf([umbrellaAt(230, 130)], [zoomed], 2), UMBRELLA);
    const expected = routeOf({ x: 0.5, y: 0.5 }, false);

    expect(bends).toStrictEqual(expected);
  });

  it('GIVEN a line out of another node WHEN it is read THEN it is left out', () => {
    const other = lineThrough('pkg:other', 'web', [
      { x: 0, y: 0 },
      { x: 5, y: 5 },
      { x: 9, y: 9 }
    ]);

    expect(routeBendsOf(readOf([umbrellaAt(200, 100)], [other], 1), UMBRELLA)).toStrictEqual({});
  });

  it('GIVEN the umbrella is not drawn WHEN it is read THEN there are no bends', () => {
    expect(routeBendsOf(readOf([], [line], 1), UMBRELLA)).toStrictEqual({});
  });
});

describe('FEATURE: bendShiftOf', () => {
  const before = routeOf({ x: 0.5, y: 0.25 });

  it('GIVEN the same bends WHEN they are compared THEN the shift is 0', () => {
    expect(bendShiftOf(before, routeOf({ x: 0.5, y: 0.25 }))).toBe(0);
  });

  it('GIVEN a bend moved 0.1 of the box WHEN they are compared THEN the shift is 0.1', () => {
    expect(bendShiftOf(before, routeOf({ x: 0.5, y: 0.35 }))).toBeCloseTo(0.1, 10);
  });

  it('GIVEN another bend count WHEN they are compared THEN the shift is infinite', () => {
    const fewer: RouteBends = { web: [], api: [] };

    expect(bendShiftOf(before, fewer)).toBe(Number.POSITIVE_INFINITY);
  });

  it('GIVEN another target WHEN they are compared THEN the shift is infinite', () => {
    const bends = [{ x: 0.5, y: 0.25 }];
    const other: RouteBends = { web: bends, docs: [] };

    expect(bendShiftOf(before, other)).toBe(Number.POSITIVE_INFINITY);
  });
});
