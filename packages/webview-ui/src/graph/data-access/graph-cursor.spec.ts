import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listenCursor } from './graph-cursor.ts';
import { CANVAS_ELEMENTS } from '../test/utils/canvas-elements.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';

const AB = edgeIdOf({ source: 'a', target: 'b' });

describe('FEATURE: listenCursor', () => {
  let cy: Core;
  const paint = vi.fn<(isOver: boolean) => void>();

  beforeEach(() => {
    paint.mockClear();
    cy = cytoscape({ headless: true, styleEnabled: true, elements: CANVAS_ELEMENTS });
    listenCursor(cy, paint);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN the pointer enters an element', () => {
    it('WHEN it enters then leaves a node THEN paint gets true then false', () => {
      cy.getElementById('a').emit('mouseover');
      cy.getElementById('a').emit('mouseout');

      expect(paint.mock.calls).toStrictEqual([[true], [false]]);
    });

    it('WHEN it enters then leaves an edge THEN paint gets true then false', () => {
      cy.getElementById(AB).emit('mouseover');
      cy.getElementById(AB).emit('mouseout');

      expect(paint.mock.calls).toStrictEqual([[true], [false]]);
    });

    it('WHEN it leaves the canvas from a node THEN paint gets false once', () => {
      cy.getElementById('a').emit('mouseover');
      cy.emit('mouseout');

      expect(paint.mock.calls).toStrictEqual([[true], [false]]);
    });

    it('WHEN it returns to the node after leaving the canvas, with a mousemove alone THEN paint gets true again', () => {
      cy.getElementById('a').emit('mouseover');
      cy.emit('mouseout');
      cy.getElementById('a').emit('mousemove');

      expect(paint.mock.calls).toStrictEqual([[true], [false], [true]]);
    });

    it('WHEN it moves on a node already hovered THEN paint hears nothing more', () => {
      cy.getElementById('a').emit('mouseover');
      cy.getElementById('a').emit('mousemove');
      cy.getElementById('a').emit('mousemove');

      expect(paint.mock.calls).toStrictEqual([[true]]);
    });

    it('WHEN the camera moves under a hovered node THEN paint gets false, and the next mousemove true', () => {
      cy.getElementById('a').emit('mouseover');
      cy.emit('viewport');
      cy.getElementById('a').emit('mousemove');

      expect(paint.mock.calls).toStrictEqual([[true], [false], [true]]);
    });
  });
});
