import { describe, expect, it } from 'vitest';

import { ghostMarksOf } from './ghost-marks.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { GhostMarks } from '../common/ghost.type.ts';
import type { TraceDirection, TraceResult } from '../common/trace.type.ts';

const pairOf = (path: string[], index: number): GraphEdge => {
  const edge: GraphEdge = { source: path[index] ?? '', target: path[index + 1] ?? '' };

  return edge;
};

const traceOf = (direction: TraceDirection, path: string[]): TraceResult => {
  const pairs = path.slice(1).map((_name: string, index: number): GraphEdge => pairOf(path, index));
  const trace: TraceResult = { direction, path, edges: pairs };

  return trace;
};

const pairLabel = (edge: GraphEdge): string => `${edge.source}>${edge.target}`;

const MIDDLE_HIDDEN = traceOf('forward', ['a', 'b', 'c']);

describe('FEATURE: ghostMarksOf', () => {
  describe('GIVEN a trace and the visible packages', () => {
    it.each([
      { title: 'no trace', trace: null, visible: ['a', 'b', 'c'], nodes: [], edgePairs: [] },
      { title: 'no path', trace: traceOf('none', []), visible: ['a', 'b', 'c'], nodes: [], edgePairs: [] },
      { title: 'every package visible', trace: MIDDLE_HIDDEN, visible: ['a', 'b', 'c'], nodes: [], edgePairs: [] },
      { title: 'middle hidden', trace: MIDDLE_HIDDEN, visible: ['a', 'c'], nodes: ['b'], edgePairs: ['a>b', 'b>c'] },
      { title: 'end hidden', trace: MIDDLE_HIDDEN, visible: ['a', 'b'], nodes: ['c'], edgePairs: ['b>c'] },
      {
        title: 'two adjacent hidden',
        trace: traceOf('forward', ['a', 'b', 'c', 'd']),
        visible: ['a', 'd'],
        nodes: ['b', 'c'],
        edgePairs: ['a>b', 'b>c', 'c>d']
      },
      {
        title: 'two apart hidden',
        trace: traceOf('forward', ['a', 'b', 'c', 'd', 'e']),
        visible: ['a', 'c', 'e'],
        nodes: ['b', 'd'],
        edgePairs: ['a>b', 'b>c', 'c>d', 'd>e']
      },
      {
        title: 'backward trace',
        trace: traceOf('backward', ['a', 'b', 'c']),
        visible: ['a', 'c'],
        nodes: ['b'],
        edgePairs: ['a>b', 'b>c']
      },
      {
        title: '__proto__ ghost',
        trace: traceOf('forward', ['a', '__proto__', 'c']),
        visible: ['a', 'c'],
        nodes: ['__proto__'],
        edgePairs: ['a>__proto__', '__proto__>c']
      },
      { title: 'nothing visible', trace: MIDDLE_HIDDEN, visible: [], nodes: ['a', 'b', 'c'], edgePairs: ['a>b', 'b>c'] }
    ])('WHEN $title THEN the ghost nodes and edges are exact', ({ trace, visible, nodes, edgePairs }) => {
      const marks = ghostMarksOf(trace, new Set(visible));

      expect(marks.nodes).toStrictEqual(nodes);
      expect(marks.edges.map(pairLabel)).toStrictEqual(edgePairs);
    });

    it('WHEN the middle is hidden THEN the first ghost edge is the trace own edge object', () => {
      const marks: GhostMarks = ghostMarksOf(MIDDLE_HIDDEN, new Set(['a', 'c']));

      expect(marks.edges[0]).toBe(MIDDLE_HIDDEN.edges[0]);
    });
  });
});
