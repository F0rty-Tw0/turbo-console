import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listenCursor } from './graph-cursor.ts';
import { GHOST_CLASS } from '../common/graph.const.ts';
import { CANVAS_ELEMENTS } from '../test/utils/canvas-elements.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';
import { folderLinkIdOf } from '../utils/folder-id.util.ts';

const AB = edgeIdOf({ source: 'a', target: 'b' });

const FOLDER_LINK_DATA = { id: folderLinkIdOf('a', 'c'), source: 'a', target: 'c' };

const FOLDER_LINK: ElementDefinition = { data: FOLDER_LINK_DATA };

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

  describe('GIVEN the pointer enters an element whose tap does nothing', () => {
    it('WHEN it enters and moves on a ghost node THEN paint hears nothing', () => {
      const node = cy.getElementById('a');

      node.addClass(GHOST_CLASS);
      node.emit('mouseover');
      node.emit('mousemove');

      expect(paint).not.toHaveBeenCalled();
    });

    it('WHEN it enters and moves on a ghost edge THEN paint hears nothing', () => {
      const edge = cy.getElementById(AB);

      edge.addClass(GHOST_CLASS);
      edge.emit('mouseover');
      edge.emit('mousemove');

      expect(paint).not.toHaveBeenCalled();
    });

    it('WHEN it enters and moves on a folder link THEN paint hears nothing', () => {
      const link = cy.add(FOLDER_LINK);

      link.emit('mouseover');
      link.emit('mousemove');

      expect(paint).not.toHaveBeenCalled();
    });
  });
});
