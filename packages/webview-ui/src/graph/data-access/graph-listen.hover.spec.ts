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

    it('WHEN the pointer moves on a node it never left THEN onHoverNode hears nothing more', () => {
      cy.getElementById('a').emit('mouseover');
      cy.getElementById('a').emit('mousemove');

      expect(vi.mocked(handlers.onHoverNode).mock.calls).toStrictEqual([['a']]);
    });

    it('WHEN the pointer leaves the canvas from a node and returns to it THEN onHoverNode gets its id again', () => {
      cy.getElementById('a').emit('mouseover');
      cy.emit('mouseout');
      cy.getElementById('a').emit('mousemove');

      expect(vi.mocked(handlers.onHoverNode).mock.calls).toStrictEqual([['a'], [null], ['a']]);
    });

    it('WHEN the pointer moves twice after returning THEN onHoverNode hears the node once', () => {
      cy.getElementById('a').emit('mouseover');
      cy.emit('mouseout');
      cy.getElementById('a').emit('mousemove');
      cy.getElementById('a').emit('mousemove');

      expect(vi.mocked(handlers.onHoverNode).mock.calls).toStrictEqual([['a'], [null], ['a']]);
    });

    it('WHEN the pointer returns onto another node, which also gets a mouseover, THEN onHoverNode hears it once', () => {
      cy.getElementById('a').emit('mouseover');
      cy.emit('mouseout');
      cy.getElementById('b').emit('mousemove');
      cy.getElementById('b').emit('mouseover');

      expect(vi.mocked(handlers.onHoverNode).mock.calls).toStrictEqual([['a'], [null], ['b']]);
    });

    it('WHEN the pointer returns to a node, leaves it and enters it again THEN onHoverNode hears each enter', () => {
      cy.emit('mouseout');
      cy.getElementById('a').emit('mousemove');
      cy.getElementById('a').emit('mouseout');
      cy.getElementById('a').emit('mouseover');

      expect(vi.mocked(handlers.onHoverNode).mock.calls).toStrictEqual([[null], ['a'], [null], ['a']]);
    });

    it('WHEN the pointer enters an edge THEN onHoverNode hears nothing', () => {
      cy.getElementById(edgeIdOf({ source: 'a', target: 'b' })).emit('mouseover');

      expect(handlers.onHoverNode).not.toHaveBeenCalled();
    });
  });
});
