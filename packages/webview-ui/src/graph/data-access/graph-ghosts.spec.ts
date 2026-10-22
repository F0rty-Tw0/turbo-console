import cytoscape from 'cytoscape';
import type { Core, EdgeSingular, ElementDefinition, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setGhosts } from './graph-ghosts.ts';
import { applyPaint } from './graph-paint.ts';
import { graphStyleOf } from './graph-style.ts';
import { showOnly } from './graph-visibility.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { GhostMarks } from '../common/ghost.type.ts';
import type { Paint } from '../common/paint.type.ts';
import { CANVAS_COLORS, canvasEdgeOf, canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';

const NODE_IDS = ['a', 'b', 'c', 'd', '__proto__'];

const NODES: ElementDefinition[] = NODE_IDS.map(canvasNodeOf);

const ELEMENTS: ElementDefinition[] = [
  ...NODES,
  canvasEdgeOf('a', 'b'),
  canvasEdgeOf('b', 'c'),
  canvasEdgeOf('d', 'b'),
  canvasEdgeOf('a', 'c'),
  canvasEdgeOf('d', '__proto__'),
  canvasEdgeOf('__proto__', 'c'),
  canvasEdgeOf('a', '__proto__')
];

const edgeOf = (source: string, target: string): GraphEdge => {
  const edge: GraphEdge = { source, target };

  return edge;
};

const V1: ReadonlySet<string> = new Set(['a', 'c', 'd', '__proto__']);

const V2: ReadonlySet<string> = new Set(['a', 'c', 'd']);

const V1_WITH_B: ReadonlySet<string> = new Set(['a', 'b', 'c', 'd', '__proto__']);

const V2_WITH_B: ReadonlySet<string> = new Set(['a', 'b', 'c', 'd']);

const MARKS_B: GhostMarks = { nodes: ['b'], edges: [edgeOf('a', 'b'), edgeOf('b', 'c')] };

const MARKS_B_AND_PROTO: GhostMarks = {
  nodes: ['b', '__proto__'],
  edges: [edgeOf('a', 'b'), edgeOf('b', 'c'), edgeOf('d', '__proto__'), edgeOf('__proto__', 'c')]
};

const MARKS_PROTO: GhostMarks = { nodes: ['__proto__'], edges: [edgeOf('d', '__proto__'), edgeOf('__proto__', 'c')] };

const NO_MARKS: GhostMarks = { nodes: [], edges: [] };

const PLAIN_PAINT: Paint = { nodeState: () => 'normal', edgeState: () => 'normal' };

const idOf = (element: NodeSingular | EdgeSingular): string => element.id();

const endsOf = (edge: EdgeSingular): string => `${edge.source().id()}>${edge.target().id()}`;

const visibleNodes = (cy: Core): string[] => cy.nodes(':visible').map(idOf).sort();

const visibleEdges = (cy: Core): string[] => cy.edges(':visible').map(endsOf).sort();

const ghostNodes = (cy: Core): string[] => cy.nodes('.ghost').map(idOf).sort();

const ghostEdges = (cy: Core): string[] => cy.edges('.ghost').map(endsOf).sort();

const edgeById = (cy: Core, source: string, target: string): EdgeSingular => cy.getElementById(edgeIdOf(edgeOf(source, target)));

describe('FEATURE: setGhosts', () => {
  let cy: Core;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: ELEMENTS });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif'));
    showOnly(cy, V1);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN b is hidden and the trace runs a, b, c', () => {
    it('WHEN the ghost marks for b are set THEN b is shown and the only ghost node', () => {
      setGhosts(cy, MARKS_B, V1);

      expect(visibleNodes(cy)).toStrictEqual(['__proto__', 'a', 'b', 'c', 'd']);
      expect(ghostNodes(cy)).toStrictEqual(['b']);
    });

    it('WHEN the ghost marks for b are set THEN the path edges are the visible ghost edges and every element keeps its events', () => {
      setGhosts(cy, MARKS_B, V1);

      const events = cy.elements().map((element): string => String(element.style('events')));

      expect(ghostEdges(cy)).toStrictEqual(['a>b', 'b>c']);
      expect(visibleEdges(cy)).toStrictEqual(expect.arrayContaining(['a>b', 'b>c']));
      expect(new Set(events)).toStrictEqual(new Set(['yes']));
    });

    it('WHEN the ghost marks for b are set THEN the other link of b is hidden and a link between visible packages stays', () => {
      setGhosts(cy, MARKS_B, V1);

      expect(visibleEdges(cy)).not.toContain('d>b');
      expect(visibleEdges(cy)).toContain('a>c');
    });

    it('WHEN the marks are then cleared THEN b is hidden again, no ghost class remains and d>b has no display bypass', () => {
      setGhosts(cy, MARKS_B, V1);

      setGhosts(cy, NO_MARKS, V1);

      expect(visibleNodes(cy)).not.toContain('b');
      expect(ghostNodes(cy)).toStrictEqual([]);
      expect(ghostEdges(cy)).toStrictEqual([]);
      expect(edgeById(cy, 'd', 'b').style('display')).toBe('element');
    });
  });

  describe('GIVEN b and __proto__ are ghosts', () => {
    it('WHEN only __proto__ stays marked and b is visible THEN b is a normal node again and __proto__ the only ghost', () => {
      showOnly(cy, V2);
      setGhosts(cy, MARKS_B_AND_PROTO, V2);

      setGhosts(cy, MARKS_PROTO, V2_WITH_B);

      expect(visibleNodes(cy)).toContain('b');
      expect(ghostNodes(cy)).toStrictEqual(['__proto__']);
      expect(ghostEdges(cy)).toStrictEqual(['__proto__>c', 'd>__proto__']);
      expect(visibleEdges(cy)).toContain('d>b');
      expect(visibleEdges(cy)).not.toContain('a>__proto__');
    });
  });

  describe('GIVEN the marks for b are set', () => {
    it('WHEN the user ticks b THEN b is visible, no ghost remains and the links of b are visible', () => {
      setGhosts(cy, MARKS_B, V1);

      showOnly(cy, V1_WITH_B);
      setGhosts(cy, NO_MARKS, V1_WITH_B);

      expect(visibleNodes(cy)).toContain('b');
      expect(ghostNodes(cy)).toStrictEqual([]);
      expect(visibleEdges(cy)).toContain('d>b');
      expect(visibleEdges(cy)).toContain('a>b');
    });

    it('WHEN the style is set again and everything is painted normal THEN b is still a shown ghost and d>b stays hidden', () => {
      setGhosts(cy, MARKS_B, V1);

      cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif'));
      applyPaint(cy, PLAIN_PAINT);

      expect(visibleNodes(cy)).toContain('b');
      expect(ghostNodes(cy)).toStrictEqual(['b']);
      expect(visibleEdges(cy)).not.toContain('d>b');
    });
  });

  describe('GIVEN no ghosts are drawn', () => {
    it('WHEN empty marks are set THEN no element style is written', () => {
      let writes = 0;

      cy.on('style', () => {
        writes += 1;
      });
      setGhosts(cy, NO_MARKS, V1);

      expect(writes).toBe(0);
    });
  });

  describe('GIVEN marks that name nothing in the graph', () => {
    it('WHEN they are set THEN nothing throws and the visible nodes are unchanged', () => {
      const before = visibleNodes(cy);
      const unknown: GhostMarks = { nodes: ['nope'], edges: [edgeOf('nope', 'nope')] };

      expect(() => setGhosts(cy, unknown, V1)).not.toThrow();
      expect(visibleNodes(cy)).toStrictEqual(before);
    });
  });
});
