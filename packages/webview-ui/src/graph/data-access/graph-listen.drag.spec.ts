import cytoscape from 'cytoscape';
import type { Core, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setBoxes } from './graph-boxes.ts';
import { listen } from './graph-listen.ts';
import type { GraphDrag, GraphViewHandlers } from '../common/graph-page.type.ts';
import { boxedCyMock } from '../test/mocks/folder-boxes.mock.ts';
import { handlersMock } from '../test/mocks/graph-handlers.mock.ts';
import { BOX_GROUPS_STUB } from '../test/stubs/folder-boxes.stub.ts';
import { CANVAS_ELEMENTS, canvasEdgeOf } from '../test/utils/canvas-elements.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';
import { folderIdOf } from '../utils/folder-id.util.ts';

const A_TO_B = edgeIdOf({ source: 'a', target: 'b' });

const B_TO_C = edgeIdOf({ source: 'b', target: 'c' });

const A_TO_C = edgeIdOf({ source: 'a', target: 'c' });

/** The edges with an end in c. */
const C_EDGES: string[] = [A_TO_C, B_TO_C];

/** The edges with an end in a or b: every edge. */
const APPS_EDGES: string[] = [A_TO_B, A_TO_C, B_TO_C];

const NO_DRAG: GraphDrag = { positions: {}, touched: [] };

/**
 * Frees a drag the way Cytoscape 3.34 does on mouse up: `dragfreeon` once on the grabbed node, then `dragfree` on every
 * dragged element, which for a box is the box and all its descendants.
 */
const freeDrag = (grabbed: NodeSingular): void => {
  const dragged = grabbed.union(grabbed.descendants());

  grabbed.emit('dragfreeon');
  dragged.emit('dragfree');
};

const firstDragOf = (handlers: GraphViewHandlers): GraphDrag => {
  const [drag] = vi.mocked(handlers.onDragEnd).mock.calls[0] ?? [];

  return drag ?? NO_DRAG;
};

const sortedTouchedOf = (handlers: GraphViewHandlers): string[] => {
  const { touched } = firstDragOf(handlers);

  return touched.toSorted();
};

describe('FEATURE: listen drag', () => {
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

  describe('GIVEN node a was dragged to 5, 6', () => {
    it('WHEN the drag is freed THEN onDragEnd gets every node centre', () => {
      cy.getElementById('a').position({ x: 5, y: 6 });

      freeDrag(cy.getElementById('a'));

      const { positions } = firstDragOf(handlers);

      expect(handlers.onDragEnd).toHaveBeenCalledOnce();
      expect(positions['a']).toStrictEqual({ x: 5, y: 6 });
      expect(Object.keys(positions).sort()).toStrictEqual(['__proto__', 'a', 'b', 'c']);
    });
  });

  describe('GIVEN the box apps holding a and b, and the edges a>b, b>c, a>c', () => {
    beforeEach(() => {
      cy.destroy();
      cy = boxedCyMock();
      cy.add(canvasEdgeOf('a', 'c'));
      setBoxes(cy, BOX_GROUPS_STUB);
      listen(cy, handlers);
    });

    it('WHEN c is dropped THEN onDragEnd gets the positions and touched [a>c, b>c]', () => {
      freeDrag(cy.getElementById('c'));

      const { positions } = firstDragOf(handlers);

      expect(positions['c']).toStrictEqual({ x: 500, y: 0 });
      expect(sortedTouchedOf(handlers)).toStrictEqual(C_EDGES.toSorted());
    });

    it('WHEN the box apps is dropped THEN touched holds every edge with an end in a or b', () => {
      freeDrag(cy.getElementById(folderIdOf('apps')));

      expect(sortedTouchedOf(handlers)).toStrictEqual(APPS_EDGES.toSorted());
    });

    it('WHEN the box moves with b hidden and its drag is freed THEN onDragEnd gets the five packages, b moved once', () => {
      const box = cy.getElementById(folderIdOf('apps'));

      cy.getElementById('b').style('display', 'none');
      box.shift({ x: 10, y: 0 });
      freeDrag(box);

      const { positions } = firstDragOf(handlers);

      expect(handlers.onDragEnd).toHaveBeenCalledOnce();
      expect(Object.keys(positions).sort()).toStrictEqual(['__proto__', 'a', 'b', 'c', 'd']);
      expect(positions['a']).toStrictEqual({ x: 10, y: 0 });
      expect(positions['b']).toStrictEqual({ x: 110, y: 0 });
    });
  });
});
