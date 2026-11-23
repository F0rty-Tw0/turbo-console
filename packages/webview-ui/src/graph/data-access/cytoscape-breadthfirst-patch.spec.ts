import cytoscape from 'cytoscape';
import type { Core, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { canvasEdgeOf, canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';

const ROOTS = ['a', 'b', 'c', 'd'];

const NAMES = [...ROOTS, 'leaf'];

describe('FEATURE: the cytoscape breadthfirst patch', () => {
  let cy: Core;
  let root: NodeSingular;

  beforeEach(() => {
    const nodes = NAMES.map(canvasNodeOf);
    const edges = ROOTS.map((id: string) => canvasEdgeOf(id, 'leaf'));

    cy = cytoscape({ headless: true, elements: [...nodes, ...edges] });
    root = cy.$id('a');
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN roots that share a row and have no row above them', () => {
    it('WHEN breadthfirst sorts the row THEN a root reads its neighborhood once', () => {
      const neighborhood = vi.spyOn(root, 'neighborhood');

      cy.layout({ name: 'breadthfirst', directed: true, animate: false }).run();

      // A weighted percent of 0 counted as uncached, so every sort comparison re-read the neighborhood.
      expect(neighborhood).toHaveBeenCalledTimes(1);
    });
  });
});
