import { describe, expect, it } from 'vitest';

import { closureOf, drawableEdges } from './closure.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';

const DIAMOND: GraphEdge[] = [
  { source: 'app', target: 'lib-a' },
  { source: 'app', target: 'lib-b' },
  { source: 'lib-a', target: 'core' },
  { source: 'lib-b', target: 'core' }
];

const CHAIN: GraphEdge[] = [
  { source: 'x', target: 'y' },
  { source: 'y', target: 'z' }
];

const CYCLE: GraphEdge[] = [
  { source: 'a', target: 'b' },
  { source: 'b', target: 'a' }
];

const sortedNames = (names: Set<string>): string[] => {
  const copy = [...names];

  return copy.sort();
};

describe('FEATURE: closureOf', () => {
  describe('GIVEN a diamond', () => {
    it.each([
      ['app', ['core', 'lib-a', 'lib-b'], []],
      ['lib-a', ['core'], ['app']],
      ['core', [], ['app', 'lib-a', 'lib-b']]
    ])('WHEN %s is selected THEN its dependencies and dependents are exact', (selected, dependencies, dependents) => {
      const closure = closureOf(selected, DIAMOND);

      expect(sortedNames(closure.dependencies)).toStrictEqual(dependencies);
      expect(sortedNames(closure.dependents)).toStrictEqual(dependents);
    });
  });

  describe('GIVEN a chain x > y > z', () => {
    it('WHEN y is selected THEN z is its dependency and x its dependent', () => {
      const closure = closureOf('y', CHAIN);

      expect([...closure.dependencies]).toStrictEqual(['z']);
      expect([...closure.dependents]).toStrictEqual(['x']);
    });
  });

  describe('GIVEN an isolated or unknown name', () => {
    it.each([['ghost'], ['']])('WHEN %j is selected THEN both sets are empty', (selected) => {
      const closure = closureOf(selected, DIAMOND);

      expect(closure.dependencies.size).toBe(0);
      expect(closure.dependents.size).toBe(0);
    });
  });

  describe('GIVEN a cycle a > b > a', () => {
    it('WHEN a is selected THEN b is both dependency and dependent, and a is in neither', () => {
      const closure = closureOf('a', CYCLE);

      expect([...closure.dependencies]).toStrictEqual(['b']);
      expect([...closure.dependents]).toStrictEqual(['b']);
    });
  });
});

describe('FEATURE: drawableEdges', () => {
  describe('GIVEN packages web and api', () => {
    const packages = ['web', 'api'];

    it.each([
      ['target', { source: 'web', target: 'ghost' }],
      ['source', { source: 'ghost', target: 'web' }]
    ])('WHEN an edge has an unknown %s THEN it is dropped', (_end, edge) => {
      const edges = drawableEdges(packages, [edge]);

      expect(edges).toStrictEqual([]);
    });

    it('WHEN a source>target pair repeats THEN it is kept once, in order', () => {
      const first: GraphEdge = { source: 'web', target: 'api' };
      const second: GraphEdge = { source: 'api', target: 'web' };

      const edges = drawableEdges(packages, [first, second, first]);

      expect(edges).toStrictEqual([first, second]);
    });
  });

  describe('GIVEN a root package //', () => {
    it('WHEN an edge runs from // to web THEN it is kept like any other', () => {
      const edge: GraphEdge = { source: '//', target: 'web' };

      const edges = drawableEdges(['//', 'web'], [edge]);

      expect(edges).toStrictEqual([edge]);
    });
  });

  it('GIVEN no input WHEN edges are filtered THEN the result is empty', () => {
    const edges = drawableEdges([], []);

    expect(edges).toStrictEqual([]);
  });
});
