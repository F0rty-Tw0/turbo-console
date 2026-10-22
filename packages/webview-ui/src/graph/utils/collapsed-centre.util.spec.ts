import { describe, expect, it } from 'vitest';

import { collapsedCentreOf } from './collapsed-centre.util.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';

const ORIGIN: Position = { x: 0, y: 0 };

const lookupOf = (entries: [string, Position][]): ((name: string) => Position) => {
  const positions = new Map<string, Position>(entries);

  return (name: string): Position => positions.get(name) ?? ORIGIN;
};

describe('FEATURE: collapsedCentreOf', () => {
  describe('GIVEN members at (0,0), (100,60) and a hidden one at (300,-40)', () => {
    it('WHEN the centre is taken THEN it is the middle of the bounding box of all three', () => {
      const positionOf = lookupOf([
        ['a', { x: 0, y: 0 }],
        ['b', { x: 100, y: 60 }],
        ['hidden', { x: 300, y: -40 }]
      ]);

      const centre = collapsedCentreOf(['a', 'b', 'hidden'], positionOf);

      expect(centre).toStrictEqual({ x: 150, y: 10 });
    });
  });

  it('GIVEN one member WHEN the centre is taken THEN it is that position', () => {
    const positionOf = lookupOf([['a', { x: 7, y: -3 }]]);

    const centre = collapsedCentreOf(['a'], positionOf);

    expect(centre).toStrictEqual({ x: 7, y: -3 });
  });

  it('GIVEN no member WHEN the centre is taken THEN it is the origin', () => {
    const positionOf = lookupOf([]);

    const centre = collapsedCentreOf([], positionOf);

    expect(centre).toStrictEqual({ x: 0, y: 0 });
  });

  it('GIVEN a member named __proto__ WHEN the centre is taken THEN its position counts', () => {
    const positionOf = lookupOf([
      ['__proto__', { x: 10, y: 20 }],
      ['constructor', { x: 30, y: 60 }]
    ]);

    const centre = collapsedCentreOf(['__proto__', 'constructor'], positionOf);

    expect(centre).toStrictEqual({ x: 20, y: 40 });
  });
});
