import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGraphProbe } from './graph-probe.ts';
import { graphStyleOf } from './graph-style.ts';
import type { GraphView, Viewport } from '../common/graph-page.type.ts';
import type { GraphProbe, ProbeEdge, ProbeNode } from '../common/graph-probe.type.ts';
import { CARD_MEASURES_STUB } from '../test/stubs/graph-card.stub.ts';
import { GRAPH_PROBE_STUB } from '../test/stubs/graph-probe.stub.ts';
import { CANVAS_AFFECTED_RGB, CANVAS_COLORS, canvasEdgeOf, canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';

const GHOST_CLASSES = 'highlighted ghost';

const ELEMENTS: ElementDefinition[] = [
  canvasNodeOf('a'),
  canvasNodeOf('b'),
  canvasNodeOf('c'),
  canvasEdgeOf('a', 'b'),
  canvasEdgeOf('b', 'c'),
  canvasEdgeOf('a', 'c')
];

const nodeOf = (probe: GraphProbe, id: string): ProbeNode | undefined => {
  const isId = (node: ProbeNode): boolean => node.id === id;

  return probe.nodes().find(isId);
};

const edgeOf = (probe: GraphProbe, source: string, target: string): ProbeEdge | undefined => {
  const isEnds = (edge: ProbeEdge): boolean => edge.source === source && edge.target === target;

  return probe.edges().find(isEnds);
};

describe('FEATURE: createGraphProbe ghost facts', () => {
  let cy: Core;
  let probe: GraphProbe;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: ELEMENTS });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false, CARD_MEASURES_STUB));
    cy.getElementById('b').addClass(GHOST_CLASSES);
    cy.getElementById('b').connectedEdges().addClass(GHOST_CLASSES);

    const viewport = (): Viewport => {
      const shown: Viewport = { zoom: cy.zoom(), pan: cy.pan() };

      return shown;
    };
    const view: Pick<GraphView, 'cy' | 'viewport'> = { cy: (): Core => cy, viewport };

    probe = createGraphProbe(view, GRAPH_PROBE_STUB);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN no render yet', () => {
    it('WHEN the render count is read THEN it is 0', () => {
      expect(probe.renderCount()).toBe(0);
    });
  });

  describe('GIVEN two Cytoscape renders', () => {
    it('WHEN the render count is read THEN it is 2', () => {
      cy.emit('render');
      cy.emit('render');

      expect(probe.renderCount()).toBe(2);
    });
  });

  describe('GIVEN a spy on Cytoscape', () => {
    it('WHEN the probe forces a render THEN Cytoscape force-renders once', () => {
      const forceRender = vi.spyOn(cy, 'forceRender');

      probe.forceRender();

      expect(forceRender).toHaveBeenCalledTimes(1);
    });
  });

  describe('GIVEN a headless Cytoscape, which has no layered texture cache', () => {
    it('WHEN the probe draws without layers THEN it throws', () => {
      expect(() => probe.drawWithoutLayers()).toThrow('graph e2e: no layered texture cache');
    });
  });

  describe('GIVEN a headless Cytoscape, which queues no rendered style', () => {
    it('WHEN the dirty edge ends are read THEN there are none', () => {
      expect(probe.dirtyEdgeEndIds()).toStrictEqual([]);
    });
  });

  describe('GIVEN b drawn as a ghost on the path a, b, c', () => {
    it('WHEN the nodes are read THEN b is a highlighted ghost with a dashed border', () => {
      const node = nodeOf(probe, 'b');

      expect(node).toMatchObject({ isGhost: true, state: 'highlighted', borderStyle: 'dashed' });
    });

    it('WHEN the nodes are read THEN a is no ghost and has a solid border', () => {
      const node = nodeOf(probe, 'a');

      expect(node).toMatchObject({ isGhost: false, borderStyle: 'solid' });
    });

    it('WHEN the edges are read THEN a to b is a drawn dashed ghost', () => {
      const edge = edgeOf(probe, 'a', 'b');

      expect(edge).toMatchObject({ isGhost: true, isDrawn: true, lineStyle: 'dashed' });
    });

    it('WHEN the edges are read THEN a to c is a drawn solid bezier link in the compound draw order', () => {
      const edge = edgeOf(probe, 'a', 'c');

      expect(edge).toMatchObject({ isDrawn: true, lineStyle: 'solid', curveStyle: 'bezier', zCompoundDepth: 'auto' });
    });

    it('WHEN b gets a display none bypass THEN a to b is not drawn', () => {
      cy.getElementById('b').style('display', 'none');

      const edge = edgeOf(probe, 'a', 'b');

      expect(edge).toMatchObject({ isDrawn: false });
    });

    it('WHEN c carries run-failed THEN its outline reads 2 wide in the failed colour and a has none', () => {
      cy.getElementById('c').addClass('run-failed');

      expect(nodeOf(probe, 'c')).toMatchObject({ outlineWidth: 2, outlineColor: 'rgb(255,0,17)', accentColor: null });
      expect(nodeOf(probe, 'a')).toMatchObject({ outlineWidth: 0 });
    });

    it('WHEN c carries affected-changed THEN its underlay reads the affected colour at 0.4 and a has none', () => {
      cy.getElementById('c').addClass('affected-changed');

      expect(nodeOf(probe, 'c')).toMatchObject({ underlayColor: CANVAS_AFFECTED_RGB, underlayOpacity: 0.4 });
      expect(nodeOf(probe, 'a')).toMatchObject({ underlayOpacity: 0 });
    });

    it('WHEN the visible ids are read THEN the ghost is left out', () => {
      const ids = probe.visibleIds();

      expect(ids).toStrictEqual(['a', 'c']);
    });
  });
});
