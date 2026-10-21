import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listen } from './graph-listen.ts';
import type { Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewHandlers } from '../common/graph-page.type.ts';
import { CANVAS_ELEMENTS } from '../test/utils/canvas-elements.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';

const handlersOf = (): GraphViewHandlers => {
  const handlers: GraphViewHandlers = {
    onTapNode: vi.fn(),
    onTapEdge: vi.fn(),
    onTapBackground: vi.fn(),
    onDoubleTapNode: vi.fn(),
    onDragEnd: vi.fn(),
    onViewport: vi.fn(),
    onRender: vi.fn()
  };

  return handlers;
};

describe('FEATURE: listen', () => {
  let cy: Core;
  let handlers: GraphViewHandlers;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: CANVAS_ELEMENTS });
    handlers = handlersOf();
    listen(cy, handlers);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN a node is tapped', () => {
    it('WHEN it is b THEN only onTapNode runs, once, with b', () => {
      cy.getElementById('b').emit('tap');

      expect(handlers.onTapNode).toHaveBeenCalledExactlyOnceWith('b');
      expect(handlers.onTapEdge).not.toHaveBeenCalled();
      expect(handlers.onTapBackground).not.toHaveBeenCalled();
    });

    it('WHEN it is named __proto__ THEN onTapNode gets that name', () => {
      cy.getElementById('__proto__').emit('tap');

      expect(handlers.onTapNode).toHaveBeenCalledExactlyOnceWith('__proto__');
    });
  });

  describe('GIVEN an edge is tapped', () => {
    it('WHEN it is a>b THEN onTapEdge runs once with source then target and no node or background handler runs', () => {
      cy.getElementById(edgeIdOf({ source: 'a', target: 'b' })).emit('tap');

      expect(handlers.onTapEdge).toHaveBeenCalledExactlyOnceWith('a', 'b');
      expect(handlers.onTapNode).not.toHaveBeenCalled();
      expect(handlers.onTapBackground).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN the background is tapped', () => {
    it('WHEN the core emits tap THEN onTapBackground runs once', () => {
      cy.emit('tap');

      expect(handlers.onTapBackground).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN a double tap on a node', () => {
    it('WHEN it is b THEN onDoubleTapNode runs with b', () => {
      cy.getElementById('b').emit('dbltap');

      expect(handlers.onDoubleTapNode).toHaveBeenCalledExactlyOnceWith('b');
    });
  });

  describe('GIVEN node a was dragged to 5, 6', () => {
    it('WHEN the drag is freed THEN onDragEnd gets every node centre', () => {
      cy.getElementById('a').position({ x: 5, y: 6 });

      cy.getElementById('a').emit('dragfree');

      const calls = vi.mocked(handlers.onDragEnd).mock.calls;
      const positions: Positions = calls[0]?.[0] ?? {};

      expect(calls).toHaveLength(1);
      expect(positions['a']).toStrictEqual({ x: 5, y: 6 });
      expect(Object.keys(positions).sort()).toStrictEqual(['__proto__', 'a', 'b', 'c']);
    });
  });

  describe('GIVEN the camera or the canvas changes', () => {
    it('WHEN the core emits viewport THEN onViewport runs', () => {
      cy.emit('viewport');

      expect(handlers.onViewport).toHaveBeenCalledOnce();
    });

    it('WHEN the core emits render THEN onRender runs', () => {
      cy.emit('render');

      expect(handlers.onRender).toHaveBeenCalledOnce();
    });
  });
});
