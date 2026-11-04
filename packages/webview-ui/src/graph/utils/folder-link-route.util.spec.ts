import { describe, expect, it } from 'vitest';

import { edgeIdOf } from './edge-id.util.ts';
import { firstMemberIdOf, folderLinkRouteOf } from './folder-link-route.util.ts';
import type { EdgeRoute, GraphEdge, Position } from '../../bridge/common/graph-state.type.ts';
import type { CollapsedEnd } from '../common/folder-link-route.type.ts';
import type { FolderLink } from '../common/folder-scene.type.ts';

type Point = [number, number];

type RouteRow = {
  readonly name: string;
  readonly member: EdgeRoute;
  readonly source: CollapsedEnd | null;
  readonly target: CollapsedEnd | null;
  readonly expected: EdgeRoute | null;
};

type FirstRow = {
  readonly names: string[];
  readonly least: string;
};

const BOX = { x1: 0, y1: 0, x2: 100, y2: 100 };
const CENTRE: Position = { x: 50, y: 50 };
const FAR_BOX = { x1: 200, y1: 200, x2: 300, y2: 300 };
const FAR_CENTRE: Position = { x: 250, y: 250 };

const pointOf = ([x, y]: Point): Position => {
  const position: Position = { x, y };

  return position;
};

const routeOf = (start: Point, bends: Point[], end: Point): EdgeRoute => {
  const route: EdgeRoute = { start: pointOf(start), bends: bends.map(pointOf), end: pointOf(end) };

  return route;
};

const endOf = (centre: Position, box: CollapsedEnd['box']): CollapsedEnd => {
  const collapsed: CollapsedEnd = { centre, box };

  return collapsed;
};

const edgeOf = (source: string): GraphEdge => {
  const edge: GraphEdge = { source, target: 'z' };

  return edge;
};

const linkOf = (names: string[]): FolderLink => {
  const link: FolderLink = { source: 'a', target: 'b', links: names.map(edgeOf) };

  return link;
};

const MIXED_EXPECTED = routeOf(
  [50, 50],
  [
    [120, 150],
    [140, 200]
  ],
  [50, 300]
);

const REVERSE_EXPECTED = routeOf(
  [50, 300],
  [
    [140, 200],
    [120, 150]
  ],
  [50, 50]
);

const BOTH_EXPECTED = routeOf([50, 50], [[150, 150]], [250, 250]);

const FRAME_EXPECTED = routeOf([50, 50], [[120, 150]], [50, 300]);

const ROWS: RouteRow[] = [
  {
    name: 'every bend inside the source box',
    member: routeOf(
      [20, 20],
      [
        [30, 40],
        [60, 90]
      ],
      [50, 300]
    ),
    source: endOf(CENTRE, BOX),
    target: null,
    expected: null
  },
  {
    name: 'mixed: bends inside and outside',
    member: routeOf(
      [20, 20],
      [
        [30, 40],
        [120, 150],
        [140, 200]
      ],
      [50, 300]
    ),
    source: endOf(CENTRE, BOX),
    target: null,
    expected: MIXED_EXPECTED
  },
  {
    name: 'reverse: the collapsed target lies above',
    member: routeOf(
      [50, 300],
      [
        [140, 200],
        [120, 150],
        [60, 90]
      ],
      [30, 20]
    ),
    source: null,
    target: endOf(CENTRE, BOX),
    expected: REVERSE_EXPECTED
  },
  {
    name: 'both ends collapsed: bends outside both boxes only',
    member: routeOf(
      [20, 20],
      [
        [30, 40],
        [150, 150],
        [260, 260]
      ],
      [230, 230]
    ),
    source: endOf(CENTRE, BOX),
    target: endOf(FAR_CENTRE, FAR_BOX),
    expected: BOTH_EXPECTED
  },
  {
    name: 'a bend on the frame line counts as inside',
    member: routeOf(
      [20, 20],
      [
        [100, 50],
        [120, 150]
      ],
      [50, 300]
    ),
    source: endOf(CENTRE, BOX),
    target: null,
    expected: FRAME_EXPECTED
  }
];

const FIRST_ROWS: FirstRow[] = [
  { names: ['c', 'a', 'b'], least: 'a' },
  { names: ['b', 'B', 'a'], least: 'a' },
  { names: ['z', 'y'], least: 'y' }
];

describe('FEATURE: folderLinkRouteOf', () => {
  describe('GIVEN a member route and collapsed ends', () => {
    it.each(ROWS)('GIVEN $name WHEN the link route is built THEN it keeps the outside bends and the collapsed centres', (row) => {
      expect(folderLinkRouteOf(row.member, row.source, row.target)).toStrictEqual(row.expected);
    });
  });

  describe('GIVEN no member route', () => {
    it('WHEN the link route is built THEN it is null', () => {
      expect(folderLinkRouteOf(undefined, endOf(CENTRE, BOX), null)).toBeNull();
    });
  });
});

describe('FEATURE: firstMemberIdOf', () => {
  describe('GIVEN members out of order', () => {
    it.each(FIRST_ROWS)('GIVEN members $names WHEN the first is picked THEN it is the least edge id by localeCompare', (row) => {
      const expected = edgeIdOf(edgeOf(row.least));

      expect(firstMemberIdOf(linkOf(row.names))).toBe(expected);
    });
  });
});
