/* eslint-disable @typescript-eslint/naming-convention, no-underscore-dangle -- the probe's window names are the e2e contract */

import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createGraphProbe, exposeProbe } from './graph-probe.ts';
import { graphStyleOf } from './graph-style.ts';
import type { GraphView, Viewport } from '../common/graph-page.type.ts';
import type { GraphProbe, ProbeEdge, ProbeHost, ProbeNode } from '../common/graph-probe.type.ts';
import { GRAPH_PROBE_STUB } from '../test/stubs/graph-probe.stub.ts';
import { CANVAS_COLORS, canvasEdgeOf, canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';

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

describe('FEATURE: exposeProbe', () => {
  it.each([
    ['no flag', {}],
    ["the string 'true'", { __tcGraphProbeWanted: 'true' }],
    ['the number 1', { __tcGraphProbeWanted: 1 }]
  ])('GIVEN %s WHEN the probe is offered THEN none is exposed', (_name, host: ProbeHost) => {
    exposeProbe(host, GRAPH_PROBE_STUB);

    expect(host.__tcGraphProbe).toBeUndefined();
  });

  it('GIVEN the flag true WHEN the probe is offered THEN the host holds that probe', () => {
    const host: ProbeHost = { __tcGraphProbeWanted: true };

    exposeProbe(host, GRAPH_PROBE_STUB);

    const exposed: GraphProbe | undefined = host.__tcGraphProbe;

    expect(exposed).toBe(GRAPH_PROBE_STUB);
  });
});

describe('FEATURE: createGraphProbe ghost facts', () => {
  let cy: Core;
  let probe: GraphProbe;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: ELEMENTS });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif'));
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

    it('WHEN the edges are read THEN a to c is a drawn solid link', () => {
      const edge = edgeOf(probe, 'a', 'c');

      expect(edge).toMatchObject({ isGhost: false, isDrawn: true, lineStyle: 'solid' });
    });

    it('WHEN b gets a display none bypass THEN a to b is not drawn', () => {
      cy.getElementById('b').style('display', 'none');

      const edge = edgeOf(probe, 'a', 'b');

      expect(edge).toMatchObject({ isDrawn: false });
    });

    it('WHEN the visible ids are read THEN the ghost is left out', () => {
      const ids = probe.visibleIds();

      expect(ids).toStrictEqual(['a', 'c']);
    });
  });
});
