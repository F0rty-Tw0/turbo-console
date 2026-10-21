import { describe, expect, it } from 'vitest';

import { neighboursOf } from './neighbours.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { Neighbours } from '../common/neighbours.type.ts';

const edgeOf = (label: string): GraphEdge => {
  const [source = '', target = ''] = label.split('>');
  const edge: GraphEdge = { source, target };

  return edge;
};

const edgesOf = (labels: string[]): GraphEdge[] => labels.map(edgeOf);

const E = edgesOf(['web>ui', 'web>core', 'docs>web', 'ui>core']);

const DUPLICATE = edgesOf(['web>ui', 'web>ui']);

const CASED = edgesOf(['x>b', 'x>B', 'x>a']);

const PROTO = edgesOf(['__proto__>constructor', 'constructor>__proto__']);

type NeighboursRow = {
  readonly title: string;
  readonly name: string;
  readonly edges: GraphEdge[];
  readonly dependencies: string[];
  readonly dependents: string[];
};

const ROWS: NeighboursRow[] = [
  { title: 'web in E', name: 'web', edges: E, dependencies: ['core', 'ui'], dependents: ['docs'] },
  { title: 'core in E', name: 'core', edges: E, dependencies: [], dependents: ['ui', 'web'] },
  { title: 'a package with no edges', name: 'lonely', edges: E, dependencies: [], dependents: [] },
  { title: 'a repeated edge', name: 'web', edges: DUPLICATE, dependencies: ['ui'], dependents: [] },
  { title: 'mixed-case names', name: 'x', edges: CASED, dependencies: ['B', 'a', 'b'], dependents: [] },
  { title: 'Object.prototype names', name: '__proto__', edges: PROTO, dependencies: ['constructor'], dependents: ['constructor'] }
];

describe('FEATURE: neighboursOf', () => {
  describe('GIVEN a package and the graph edges', () => {
    it.each(ROWS)('WHEN the neighbours of $title are listed THEN each is named once in code-unit order', (row) => {
      const expected: Neighbours = { dependencies: row.dependencies, dependents: row.dependents };

      const neighbours = neighboursOf(row.name, row.edges);

      expect(neighbours).toStrictEqual(expected);
    });
  });
});
