import { describe, expect, it } from 'vitest';

import { labelOffsetOf } from './label-offset.util.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';

type Point = [number, number];

type OffsetRow = {
  readonly name: string;
  readonly points: Point[];
  readonly anchor: Point;
  readonly x: number;
  readonly y: number;
};

const SIZE = { width: 40, height: 16 };
const DIAGONAL = (28 / Math.SQRT2 + 4) / Math.SQRT2;

const pointOf = ([x, y]: Point): Position => {
  const position: Position = { x, y };

  return position;
};

const ROWS: OffsetRow[] = [
  {
    name: 'a horizontal segment left to right',
    points: [
      [0, 0],
      [100, 0]
    ],
    anchor: [50, 0],
    x: 0,
    y: 12
  },
  {
    name: 'a vertical segment top to bottom',
    points: [
      [0, 0],
      [0, 100]
    ],
    anchor: [0, 50],
    x: -24,
    y: 0
  },
  {
    name: 'a 45 degree segment',
    points: [
      [0, 0],
      [100, 100]
    ],
    anchor: [50, 50],
    x: -DIAGONAL,
    y: DIAGONAL
  },
  {
    name: 'the anchor nearest the second of three segments',
    points: [
      [0, 0],
      [0, 100],
      [100, 100],
      [100, 200]
    ],
    anchor: [50, 100],
    x: 0,
    y: 12
  },
  {
    name: 'a zero-length first segment is skipped',
    points: [
      [0, 0],
      [0, 0],
      [100, 0]
    ],
    anchor: [50, 0],
    x: 0,
    y: 12
  },
  {
    name: 'every segment zero length',
    points: [
      [5, 5],
      [5, 5]
    ],
    anchor: [5, 5],
    x: 0,
    y: 0
  },
  { name: 'a path of one point', points: [[1, 1]], anchor: [1, 1], x: 0, y: 0 },
  {
    name: 'a bend, down then left',
    points: [
      [0, 0],
      [0, 100],
      [-100, 100]
    ],
    anchor: [0, 100],
    x: 24,
    y: 0
  },
  {
    name: 'a bend, down then right',
    points: [
      [0, 0],
      [0, 100],
      [100, 100]
    ],
    anchor: [0, 100],
    x: -24,
    y: 0
  },
  {
    name: 'a bend, the anchor on the arc 6 px off',
    points: [
      [0, 0],
      [0, 100],
      [-100, 100]
    ],
    anchor: [-1.76, 98.24],
    x: 25.76,
    y: 0
  },
  {
    name: 'a 20 degree bend',
    points: [
      [0, 0],
      [0, 100],
      [34.2, 194]
    ],
    anchor: [0, 100],
    x: -24,
    y: 0
  }
];

describe('FEATURE: labelOffsetOf', () => {
  describe('GIVEN a label 40 x 16 and a gap of 4', () => {
    it.each(ROWS)('GIVEN $name WHEN the label offset is computed THEN it is the hand-computed offset', (row) => {
      const offset = labelOffsetOf(row.points.map(pointOf), pointOf(row.anchor), SIZE);

      expect(offset.x).toBeCloseTo(row.x, 6);
      expect(offset.y).toBeCloseTo(row.y, 6);
    });
  });
});
