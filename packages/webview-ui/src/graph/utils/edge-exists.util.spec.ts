import { describe, expect, it } from 'vitest';

import { hasEdge } from './edge-exists.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';

const E: GraphEdge[] = [
  { source: 'web', target: 'ui' },
  { source: 'ui', target: 'core' }
];

const PROTO: GraphEdge[] = [{ source: '__proto__', target: 'constructor' }];

describe('FEATURE: hasEdge', () => {
  it.each([
    { title: 'the link runs that way', edges: E, source: 'web', target: 'ui', expected: true },
    { title: 'the link runs the other way', edges: E, source: 'ui', target: 'web', expected: false },
    { title: 'only a longer path joins them', edges: E, source: 'web', target: 'core', expected: false },
    { title: 'there are no links', edges: [], source: 'web', target: 'ui', expected: false },
    { title: 'the names are __proto__ and constructor', edges: PROTO, source: '__proto__', target: 'constructor', expected: true }
  ])('GIVEN edges WHEN $title THEN it is $expected', ({ edges, source, target, expected }) => {
    const found = hasEdge(edges, source, target);

    expect(found).toBe(expected);
  });
});
