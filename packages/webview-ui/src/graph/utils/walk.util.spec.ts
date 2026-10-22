import { describe, expect, it } from 'vitest';

import { walkFrom } from './walk.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';

const DIAMOND: GraphEdge[] = [
  { source: 'app', target: 'lib-b' },
  { source: 'app', target: 'lib-a' },
  { source: 'lib-b', target: 'core' },
  { source: 'lib-a', target: 'core' }
];

const CYCLE: GraphEdge[] = [
  { source: 'a', target: 'b' },
  { source: 'b', target: 'a' }
];

describe('FEATURE: walkFrom', () => {
  describe('GIVEN a diamond whose edges are listed against name order', () => {
    it('WHEN walking dependencies THEN distances count links from the first package', () => {
      const walk = walkFrom(DIAMOND, 'app', 'dependencies');

      expect([...walk.distances]).toStrictEqual([
        ['app', 0],
        ['lib-a', 1],
        ['lib-b', 1],
        ['core', 2]
      ]);
    });

    it('WHEN walking dependencies THEN the parent is the first package that reached it', () => {
      const walk = walkFrom(DIAMOND, 'app', 'dependencies');

      expect(walk.parents.get('core')).toBe('lib-a');
    });

    it('WHEN walking dependents THEN edges are followed target to source', () => {
      const walk = walkFrom(DIAMOND, 'core', 'dependents');
      const keys = walk.distances.keys();
      const reached = [...keys];

      expect(reached).toStrictEqual(['core', 'lib-a', 'lib-b', 'app']);
    });
  });

  describe('GIVEN a cycle', () => {
    it('WHEN walking THEN every package is visited once and the walk ends', () => {
      const walk = walkFrom(CYCLE, 'a', 'dependencies');

      expect([...walk.distances]).toStrictEqual([
        ['a', 0],
        ['b', 1]
      ]);
    });
  });

  describe('GIVEN a first package with no edges', () => {
    it('WHEN walking THEN only the first package is reached, with no parent', () => {
      const walk = walkFrom(DIAMOND, 'lonely', 'dependencies');

      expect([...walk.distances]).toStrictEqual([['lonely', 0]]);
      expect(walk.parents.size).toBe(0);
    });
  });
});
