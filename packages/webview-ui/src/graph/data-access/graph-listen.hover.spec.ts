import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listen } from './graph-listen.ts';
import type { GraphViewHandlers } from '../common/graph-page.type.ts';
import { handlersMock } from '../test/mocks/graph-handlers.mock.ts';
import { CANVAS_ELEMENTS } from '../test/utils/canvas-elements.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';

describe('FEATURE: listen hover', () => {
  let cy: Core;
  let handlers: GraphViewHandlers;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: CANVAS_ELEMENTS });
    handlers = handlersMock();
    listen(cy, handlers);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN the pointer moves over a node', () => {
    it('WHEN the pointer enters then leaves a node THEN onHoverNode gets its id then null', () => {
      cy.getElementById('a').emit('mouseover');
      cy.getElementById('a').emit('mouseout');

      expect(vi.mocked(handlers.onHoverNode).mock.calls).toStrictEqual([['a'], [null]]);
    });

    it('WHEN the pointer leaves the canvas straight from a node THEN onHoverNode gets null from the core', () => {
      cy.getElementById('a').emit('mouseover');
      cy.emit('mouseout');

      expect(vi.mocked(handlers.onHoverNode).mock.calls).toStrictEqual([['a'], [null]]);
    });

    it('WHEN the pointer enters an edge THEN onHoverNode hears nothing', () => {
      cy.getElementById(edgeIdOf({ source: 'a', target: 'b' })).emit('mouseover');

      expect(handlers.onHoverNode).not.toHaveBeenCalled();
    });
  });
});
