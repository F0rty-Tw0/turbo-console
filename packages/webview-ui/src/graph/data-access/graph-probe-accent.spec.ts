import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createGraphProbe } from './graph-probe.ts';
import { graphStyleOf } from './graph-style.ts';
import type { GraphView, Viewport } from '../common/graph-page.type.ts';
import type { GraphProbe, ProbeNode } from '../common/graph-probe.type.ts';
import { GRAPH_PROBE_STUB } from '../test/stubs/graph-probe.stub.ts';
import { CANVAS_COLORS, canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';

const nodeOf = (probe: GraphProbe, id: string): ProbeNode | undefined => {
  const isId = (node: ProbeNode): boolean => node.id === id;

  return probe.nodes().find(isId);
};

describe('FEATURE: createGraphProbe accent colour', () => {
  let cy: Core;
  let probe: GraphProbe;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: [canvasNodeOf('a'), canvasNodeOf('c'), canvasNodeOf('d')] });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));

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

  it('WHEN c is a card classed run-failed THEN accentColor is the failed colour with no outline, a card with no run has none and a plain run-failed node has no bar', () => {
    cy.getElementById('c').addClass('task task-card run-failed');
    cy.getElementById('a').addClass('task task-card');
    cy.getElementById('d').addClass('run-failed');

    expect(nodeOf(probe, 'c')).toMatchObject({ accentColor: 'rgb(255,0,17)', outlineWidth: 0 });
    expect(nodeOf(probe, 'a')).toMatchObject({ accentColor: null });
    expect(nodeOf(probe, 'd')).toMatchObject({ accentColor: null, outlineWidth: 2 });
  });
});
