import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGraphProbe } from './graph-probe.ts';
import { graphStyleOf } from './graph-style.ts';
import type { GraphView, Viewport } from '../common/graph-page.type.ts';
import type { GraphProbe } from '../common/graph-probe.type.ts';
import { GRAPH_PROBE_STUB } from '../test/stubs/graph-probe.stub.ts';
import { CANVAS_COLORS, canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';

describe('FEATURE: createGraphProbe label fit', () => {
  let cy: Core;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: [canvasNodeOf('a')] });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));
  });

  afterEach(() => {
    cy.destroy();
  });

  const probeOf = (): GraphProbe => {
    const viewport = (): Viewport => {
      const shown: Viewport = { zoom: cy.zoom(), pan: cy.pan() };

      return shown;
    };
    const view: Pick<GraphView, 'cy' | 'viewport'> = { cy: (): Core => cy, viewport };

    return createGraphProbe(view, GRAPH_PROBE_STUB);
  };

  describe('GIVEN a headless graph', () => {
    it('WHEN the probe reads the fit of a THEN it has no label box and no measured label', () => {
      expect(probeOf().labelFit('a')).toMatchObject({ labelBoxWidth: null, labelWidth: 0 });
    });

    it('WHEN the probe reads its nodes THEN no node runs boundingBox or renderedBoundingBox', () => {
      const node = cy.getElementById('a');
      const boundingBox = vi.spyOn(node, 'boundingBox');
      const renderedBoundingBox = vi.spyOn(node, 'renderedBoundingBox');

      probeOf().nodes();

      expect(boundingBox).not.toHaveBeenCalled();
      expect(renderedBoundingBox).not.toHaveBeenCalled();
    });
  });
});
