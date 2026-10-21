import type { ElkNode } from 'elkjs/lib/elk-api.js';
import { describe, expect, it } from 'vitest';

import { cellPitchOf, gridPositions } from './grid-layout.util.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';

const childOf = (id: string, width: number): ElkNode => {
  const child: ElkNode = { id, width, height: 32 };

  return child;
};

const NARROW = childOf('a', 40);

const WIDE = childOf('b', 100);

const NO_WIDTH: ElkNode = { id: 'a' };

const graphOf = (children: ElkNode[]): ElkNode => {
  const graph: ElkNode = { id: 'root', children, edges: [] };

  return graph;
};

describe('FEATURE: cellPitchOf', () => {
  it('GIVEN children 40 and 100 px wide WHEN the pitch is taken THEN it is 124 across and 96 down', () => {
    const pitch = cellPitchOf([NARROW, WIDE]);

    expect(pitch).toStrictEqual({ x: 124, y: 96 });
  });

  it('GIVEN no children WHEN the pitch is taken THEN it is the padding across', () => {
    const pitch = cellPitchOf([]);

    expect(pitch).toStrictEqual({ x: 24, y: 96 });
  });

  it('GIVEN a child with no width WHEN the pitch is taken THEN it counts as 0 px wide', () => {
    const pitch = cellPitchOf([NO_WIDTH]);

    expect(pitch.x).toBe(24);
  });
});

const cellAt = (x: number, y: number): Position => {
  const cell: Position = { x, y };

  return cell;
};

const ROW_ONE: Positions = { a: cellAt(0, 0), b: cellAt(124, 0), c: cellAt(248, 0) };

const ROW_TWO: Positions = { d: cellAt(0, 96), e: cellAt(124, 96) };

describe('FEATURE: gridPositions', () => {
  describe('GIVEN five children', () => {
    const names = ['a', 'b', 'c', 'd', 'e'];
    const children = names.map((name: string): ElkNode => childOf(name, 100));

    it('WHEN laid out THEN they fill rows of three, left to right, top to bottom', () => {
      const positions = gridPositions(graphOf(children));

      expect(positions).toStrictEqual({ ...ROW_ONE, ...ROW_TWO });
    });
  });

  it('GIVEN children named like Object members WHEN laid out THEN each is an own key', () => {
    const children = [childOf('__proto__', 40), childOf('constructor', 40)];

    const positions = gridPositions(graphOf(children));

    expect(Object.keys(positions)).toStrictEqual(['__proto__', 'constructor']);
  });

  it('GIVEN a graph with no children WHEN laid out THEN there are no positions', () => {
    const positions = gridPositions({ id: 'root' });

    expect(positions).toStrictEqual({});
  });
});
