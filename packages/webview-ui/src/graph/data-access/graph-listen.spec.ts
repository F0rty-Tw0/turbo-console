import cytoscape from 'cytoscape';
import type { Core, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setBoxes } from './graph-boxes.ts';
import { createFoldersView } from './graph-folders-view.ts';
import { listen } from './graph-listen.ts';
import type { Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewHandlers } from '../common/graph-page.type.ts';
import { boardsCyMock } from '../test/mocks/folder-boards.mock.ts';
import { boxedCyMock } from '../test/mocks/folder-boxes.mock.ts';
import { handlersMock } from '../test/mocks/graph-handlers.mock.ts';
import { BOX_GROUPS_STUB } from '../test/stubs/folder-boxes.stub.ts';
import { CANVAS_ELEMENTS } from '../test/utils/canvas-elements.spec.util.ts';
import { boardsSceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';
import { collapsedIdOf, folderIdOf, folderLinkIdOf } from '../utils/folder-id.util.ts';

const APPS_NODE = collapsedIdOf('apps');

const APPS_TO_UI = folderLinkIdOf(APPS_NODE, '@acme/ui');

/**
 * Frees a drag the way Cytoscape 3.34 does on mouse up: `dragfreeon` once on the grabbed node, then `dragfree` on every
 * dragged element, which for a box is the box and all its descendants.
 */
const freeDrag = (grabbed: NodeSingular): void => {
  const dragged = grabbed.union(grabbed.descendants());

  grabbed.emit('dragfreeon');
  dragged.emit('dragfree');
};

const firstDragOf = (handlers: GraphViewHandlers): Positions => {
  const [positions] = vi.mocked(handlers.onDragEnd).mock.calls[0] ?? [];

  return positions ?? {};
};

describe('FEATURE: listen', () => {
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

  describe('GIVEN taps 100 ms apart', () => {
    const tapAfter = (id: string | null): void => {
      vi.advanceTimersByTime(100);

      if (id === null) cy.emit('tap');
      else cy.getElementById(id).emit('tap');
    };

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('WHEN both taps are on b THEN onDoubleTapNode runs once with b, after onTapNode', () => {
      tapAfter('b');
      tapAfter('b');

      expect(handlers.onDoubleTapNode).toHaveBeenCalledExactlyOnceWith('b');
      expect(vi.mocked(handlers.onTapNode).mock.invocationCallOrder[1]).toBeLessThan(
        vi.mocked(handlers.onDoubleTapNode).mock.invocationCallOrder[0] ?? 0
      );
    });

    it('WHEN the edge a>b is tapped and then b twice THEN onDoubleTapNode runs once with b', () => {
      tapAfter(edgeIdOf({ source: 'a', target: 'b' }));
      tapAfter('b');
      tapAfter('b');

      expect(handlers.onDoubleTapNode).toHaveBeenCalledExactlyOnceWith('b');
    });

    it('WHEN the first tap is on the edge a>b THEN onDoubleTapNode does not run', () => {
      tapAfter(edgeIdOf({ source: 'a', target: 'b' }));
      tapAfter('b');

      expect(handlers.onDoubleTapNode).not.toHaveBeenCalled();
    });

    it('WHEN the first tap is on a THEN onDoubleTapNode does not run', () => {
      tapAfter('a');
      tapAfter('b');

      expect(handlers.onDoubleTapNode).not.toHaveBeenCalled();
    });

    it('WHEN the first tap is on the background THEN onDoubleTapNode does not run', () => {
      tapAfter(null);
      tapAfter('b');

      expect(handlers.onDoubleTapNode).not.toHaveBeenCalled();
    });

    it('WHEN the graph is redrawn between two taps on b THEN onDoubleTapNode runs with b', () => {
      tapAfter('b');
      cy.elements().remove();
      cy.add(CANVAS_ELEMENTS);
      tapAfter('b');

      expect(handlers.onDoubleTapNode).toHaveBeenCalledExactlyOnceWith('b');
    });

    it('WHEN b, then the edge a>b, then b are tapped THEN onDoubleTapNode does not run', () => {
      tapAfter('b');
      tapAfter(edgeIdOf({ source: 'a', target: 'b' }));
      tapAfter('b');

      expect(handlers.onDoubleTapNode).not.toHaveBeenCalled();
    });

    it('WHEN b, then the background, then b are tapped THEN onDoubleTapNode does not run', () => {
      tapAfter('b');
      tapAfter(null);
      tapAfter('b');

      expect(handlers.onDoubleTapNode).not.toHaveBeenCalled();
    });

    it('WHEN the second tap on b comes 251 ms after the first THEN onDoubleTapNode does not run', () => {
      tapAfter('b');
      vi.advanceTimersByTime(151);
      tapAfter('b');

      expect(handlers.onDoubleTapNode).not.toHaveBeenCalled();
    });

    it("WHEN Cytoscape's own dbltap fires on b THEN onDoubleTapNode does not run", () => {
      cy.getElementById('b').emit('dbltap');

      expect(handlers.onDoubleTapNode).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN b has the ghost class', () => {
    it('WHEN b is tapped THEN no handler runs', () => {
      cy.getElementById('b').addClass('ghost');

      cy.getElementById('b').emit('tap');

      expect(handlers.onTapNode).not.toHaveBeenCalled();
      expect(handlers.onTapEdge).not.toHaveBeenCalled();
      expect(handlers.onTapBackground).not.toHaveBeenCalled();
    });

    it('WHEN the ghost edge a>b is tapped THEN no handler runs', () => {
      cy.getElementById(edgeIdOf({ source: 'a', target: 'b' })).addClass('ghost');

      cy.getElementById(edgeIdOf({ source: 'a', target: 'b' })).emit('tap');

      expect(handlers.onTapEdge).not.toHaveBeenCalled();
      expect(handlers.onTapNode).not.toHaveBeenCalled();
      expect(handlers.onTapBackground).not.toHaveBeenCalled();
    });

    it('WHEN b is double tapped THEN onDoubleTapNode does not run', () => {
      cy.getElementById('b').addClass('ghost');

      cy.getElementById('b').emit('tap');
      cy.getElementById('b').emit('tap');

      expect(handlers.onDoubleTapNode).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN node a was dragged to 5, 6', () => {
    it('WHEN the drag is freed THEN onDragEnd gets every node centre', () => {
      cy.getElementById('a').position({ x: 5, y: 6 });

      freeDrag(cy.getElementById('a'));

      const calls = vi.mocked(handlers.onDragEnd).mock.calls;
      const positions: Positions = calls[0]?.[0] ?? {};

      expect(calls).toHaveLength(1);
      expect(positions['a']).toStrictEqual({ x: 5, y: 6 });
      expect(Object.keys(positions).sort()).toStrictEqual(['__proto__', 'a', 'b', 'c']);
    });
  });

  describe('GIVEN folder boxes around the packages', () => {
    beforeEach(() => {
      cy.destroy();
      cy = boxedCyMock();
      setBoxes(cy, BOX_GROUPS_STUB);
      listen(cy, handlers);
    });

    it('WHEN the apps box is tapped THEN only onTapFolder runs, once, with apps', () => {
      cy.getElementById('\u0001apps').emit('tap');

      expect(handlers.onTapFolder).toHaveBeenCalledExactlyOnceWith('apps');
      expect(handlers.onTapNode).not.toHaveBeenCalled();
      expect(handlers.onTapEdge).not.toHaveBeenCalled();
      expect(handlers.onTapBackground).not.toHaveBeenCalled();
    });

    it('WHEN the root box is tapped THEN onTapFolder runs with the empty key', () => {
      cy.getElementById('\u0001').emit('tap');

      expect(handlers.onTapFolder).toHaveBeenCalledExactlyOnceWith('');
    });

    it('WHEN package a inside a box is tapped THEN only onTapNode runs, with a', () => {
      cy.getElementById('a').emit('tap');

      expect(handlers.onTapNode).toHaveBeenCalledExactlyOnceWith('a');
      expect(handlers.onTapFolder).not.toHaveBeenCalled();
    });

    it('WHEN a is tapped, then the box, then a THEN onDoubleTapNode does not run', () => {
      cy.getElementById('a').emit('tap');
      cy.getElementById('\u0001apps').emit('tap');
      cy.getElementById('a').emit('tap');

      expect(handlers.onDoubleTapNode).not.toHaveBeenCalled();
    });

    it('WHEN the box moves with b hidden and its drag is freed THEN onDragEnd gets the five packages, b moved once', () => {
      const box = cy.getElementById('\u0001apps');

      cy.getElementById('b').style('display', 'none');
      box.shift({ x: 10, y: 0 });
      freeDrag(box);

      const positions = firstDragOf(handlers);

      expect(handlers.onDragEnd).toHaveBeenCalledOnce();
      expect(Object.keys(positions).sort()).toStrictEqual(['__proto__', 'a', 'b', 'c', 'd']);
      expect(positions['a']).toStrictEqual({ x: 10, y: 0 });
      expect(positions['b']).toStrictEqual({ x: 110, y: 0 });
    });
  });

  describe('GIVEN apps collapsed beside the packages box, taps 100 ms apart', () => {
    const tapAll = (ids: string[]): void => {
      for (const id of ids) {
        vi.advanceTimersByTime(100);
        cy.getElementById(id).emit('tap');
      }
    };

    beforeEach(() => {
      vi.useFakeTimers();
      cy.destroy();
      cy = boardsCyMock();
      createFoldersView(cy).show(boardsSceneOf(['apps']), (folder: string): string => folder);
      listen(cy, handlers);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const folderRows = [
      { id: folderIdOf('packages'), folder: 'packages' },
      { id: APPS_NODE, folder: 'apps' }
    ];

    it.each(folderRows)('WHEN $folder is tapped once THEN only onTapFolder runs, once, with $folder', ({ id, folder }) => {
      tapAll([id]);

      expect(handlers.onTapFolder).toHaveBeenCalledExactlyOnceWith(folder);
      expect(handlers.onTapNode).not.toHaveBeenCalled();
      expect(handlers.onTapBackground).not.toHaveBeenCalled();
    });

    it.each(folderRows)(
      'WHEN $folder is tapped twice THEN onDoubleTapFolder runs once with it, after onTapFolder',
      ({ id, folder }) => {
        tapAll([id, id]);

        expect(handlers.onDoubleTapFolder).toHaveBeenCalledExactlyOnceWith(folder);
        expect(handlers.onDoubleTapNode).not.toHaveBeenCalled();
        expect(vi.mocked(handlers.onTapFolder).mock.invocationCallOrder[1]).toBeLessThan(
          vi.mocked(handlers.onDoubleTapFolder).mock.invocationCallOrder[0] ?? 0
        );
      }
    );

    it('WHEN the collapsed node and then the apps box are tapped THEN onDoubleTapFolder does not run', () => {
      tapAll([APPS_NODE, folderIdOf('apps')]);

      expect(handlers.onDoubleTapFolder).not.toHaveBeenCalled();
    });

    it('WHEN the folder link is tapped THEN onTapBackground runs once and onTapEdge never', () => {
      tapAll([APPS_TO_UI]);

      expect(handlers.onTapBackground).toHaveBeenCalledOnce();
      expect(handlers.onTapEdge).not.toHaveBeenCalled();
    });

    it('WHEN ui, the folder link, then ui are tapped THEN onDoubleTapNode does not run', () => {
      tapAll(['@acme/ui', APPS_TO_UI, '@acme/ui']);

      expect(handlers.onDoubleTapNode).not.toHaveBeenCalled();
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
