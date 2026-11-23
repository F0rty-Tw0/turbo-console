import { describe, expect, it, vi } from 'vitest';

import { breadthfirstPositions } from './fallback-layout.ts';
import { FALLBACK_SPACING_FACTOR, NODE_HEIGHT } from '../common/graph.const.ts';
import { edgeOf, fallbackGraphOf } from '../test/utils/fallback-graph.spec.util.ts';

const ROW_PITCH = NODE_HEIGHT * FALLBACK_SPACING_FACTOR;

const UNIT_ROWS = [-0.5, 0.5, 1.5];

const CHAIN = ['a', 'b', 'c'];

vi.mock('cytoscape', () => {
  const headless = vi.fn((): never => {
    throw new Error('headless cytoscape');
  });
  const mocked = { default: headless };

  return mocked;
});

describe('FEATURE: breadthfirstPositions without a headless Cytoscape', () => {
  describe('GIVEN Cytoscape throws when created, and a chain a > b > c', () => {
    const chain = fallbackGraphOf(CHAIN, [edgeOf('a', 'b'), edgeOf('b', 'c')]);

    it('WHEN laid out THEN every child gets a position', () => {
      const positions = breadthfirstPositions(chain);

      expect(Object.keys(positions)).toStrictEqual(CHAIN);
    });

    it('WHEN laid out THEN a, b and c take rows -0.5, 0.5 and 1.5 pitches down', () => {
      const positions = breadthfirstPositions(chain);

      const rows = CHAIN.map((name: string): number | undefined => positions[name]?.y);
      const expected = UNIT_ROWS.map((unit: number): number => unit * ROW_PITCH);

      expect(rows).toStrictEqual(expected);
    });
  });
});
