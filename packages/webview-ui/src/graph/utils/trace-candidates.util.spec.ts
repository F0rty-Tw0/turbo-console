import { describe, expect, it } from 'vitest';

import { candidatesOf } from './trace-candidates.util.ts';
import { traceOf } from './trace.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { TraceCandidate } from '../common/trace.type.ts';

const edgesOf = (list: string): GraphEdge[] => {
  const pairs = list.split(', ');

  return pairs.map((pair) => {
    const [source = '', target = ''] = pair.split('>');
    const edge: GraphEdge = { source, target };

    return edge;
  });
};

const labelsOf = (candidates: TraceCandidate[]): string[] => candidates.map((candidate) => `${candidate.name}:${candidate.steps}`);

const without = (names: string[], ...dropped: string[]): string[] => names.filter((name) => !dropped.includes(name));

const MAIN = edgesOf('web>ui, ui>core, web>forms, forms>core, app>web, shell>app, docs>docs-util');
const ALL = ['web', 'ui', 'core', 'forms', 'app', 'shell', 'docs', 'docs-util', 'lonely'];
const BOTH_WAYS = edgesOf('a>b, b>c, c>a, c>d, e>a');
const PROTO = edgesOf('plain>__proto__, __proto__>constructor');

describe('FEATURE: candidatesOf', () => {
  describe('GIVEN a start and the visible packages', () => {
    it.each([
      {
        title: 'every package visible',
        edges: MAIN,
        start: 'web',
        visible: ALL,
        forward: ['forms:1', 'ui:1', 'core:2'],
        backward: ['app:1', 'shell:2'],
        none: ['docs', 'docs-util', 'lonely']
      },
      {
        title: 'hidden packages left out',
        edges: MAIN,
        start: 'web',
        visible: without(ALL, 'ui', 'core'),
        forward: ['forms:1'],
        backward: ['app:1', 'shell:2'],
        none: ['docs', 'docs-util', 'lonely']
      },
      {
        title: 'steps count the whole graph, not the visible',
        edges: MAIN,
        start: 'web',
        visible: without(ALL, 'forms', 'ui'),
        forward: ['core:2'],
        backward: ['app:1', 'shell:2'],
        none: ['docs', 'docs-util', 'lonely']
      },
      {
        title: 'start in the middle',
        edges: MAIN,
        start: 'ui',
        visible: ALL,
        forward: ['core:1'],
        backward: ['web:1', 'app:2', 'shell:3'],
        none: ['docs', 'docs-util', 'forms', 'lonely']
      },
      {
        title: 'start with no edges',
        edges: MAIN,
        start: 'lonely',
        visible: ALL,
        forward: [],
        backward: [],
        none: ['app', 'core', 'docs', 'docs-util', 'forms', 'shell', 'ui', 'web']
      },
      {
        title: 'start not visible is not listed, others are',
        edges: MAIN,
        start: 'web',
        visible: ['ui', 'core'],
        forward: ['ui:1', 'core:2'],
        backward: [],
        none: []
      },
      { title: 'nothing visible', edges: MAIN, start: 'web', visible: [], forward: [], backward: [], none: [] },
      {
        title: 'reachable both ways: first group only',
        edges: BOTH_WAYS,
        start: 'a',
        visible: ['a', 'b', 'c', 'd', 'e'],
        forward: ['b:1', 'c:2', 'd:3'],
        backward: ['e:1'],
        none: []
      },
      {
        title: 'equal steps, name order',
        edges: edgesOf('app>lib-b, app>lib-a, lib-a>core, lib-b>core'),
        start: 'app',
        visible: ['app', 'lib-a', 'lib-b', 'core'],
        forward: ['lib-a:1', 'lib-b:1', 'core:2'],
        backward: [],
        none: []
      },
      {
        title: 'code-unit order (B before a)',
        edges: edgesOf('s>a, s>B'),
        start: 's',
        visible: ['s', 'a', 'B'],
        forward: ['B:1', 'a:1'],
        backward: [],
        none: []
      },
      {
        title: 'duplicate edges',
        edges: edgesOf('x>y, x>y'),
        start: 'x',
        visible: ['x', 'y'],
        forward: ['y:1'],
        backward: [],
        none: []
      },
      {
        title: '__proto__ as a candidate',
        edges: PROTO,
        start: 'plain',
        visible: ['plain', '__proto__', 'constructor'],
        forward: ['__proto__:1', 'constructor:2'],
        backward: [],
        none: []
      },
      {
        title: '__proto__ as the start',
        edges: PROTO,
        start: '__proto__',
        visible: ['plain', '__proto__', 'constructor'],
        forward: ['constructor:1'],
        backward: ['plain:1'],
        none: []
      }
    ])('WHEN $title THEN the three groups are exact', (row) => {
      const visible = new Set(row.visible);
      const candidates = candidatesOf(row.edges, row.start, visible);

      expect(labelsOf(candidates.forward)).toStrictEqual(row.forward);
      expect(labelsOf(candidates.backward)).toStrictEqual(row.backward);
      expect(candidates.none).toStrictEqual(row.none);
    });
  });

  describe('GIVEN every package of a graph is visible', () => {
    it.each([
      ['MAIN from web', MAIN, 'web'],
      ['MAIN from ui', MAIN, 'ui'],
      ['reachable both ways from a', BOTH_WAYS, 'a']
    ])('WHEN %s THEN each candidate steps equal its trace link count', (_title, edges, start) => {
      const names = edges.flatMap((edge) => [edge.source, edge.target]);
      const candidates = candidatesOf(edges, start, new Set(names));

      for (const candidate of candidates.forward) {
        const trace = traceOf(edges, start, candidate.name);

        expect(trace.direction).toBe('forward');
        expect(trace.path.length - 1).toBe(candidate.steps);
      }

      for (const candidate of candidates.backward) {
        const trace = traceOf(edges, start, candidate.name);

        expect(trace.direction).toBe('backward');
        expect(trace.path.length - 1).toBe(candidate.steps);
      }
    });
  });
});
