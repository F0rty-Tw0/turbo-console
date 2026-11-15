import { beforeEach, describe, expect, it } from 'vitest';

import { GraphLayouts } from './graph-layouts.ts';
import type { GraphWebviewMessage, LayoutGrouping } from '../../bridge/common/graph-message.type.ts';
import type { EdgeRoute, GraphReady, Routes } from '../../bridge/common/graph-state.type.ts';
import { ROUTE_BENDS_MAX } from '../common/graph-layout.const.ts';
import type { GraphDrag } from '../common/graph-page.type.ts';
import type { LayoutResult } from '../common/layout.type.ts';
import type { LayoutsRig } from '../test/common/graph-layouts.type.ts';
import {
  DRAGGED_POSITIONS_STUB,
  FLAT_POSITIONS_STUB,
  GROUPED_POSITIONS_STUB,
  SAVED_FLAT_STUB,
  SAVED_GROUPED_STUB,
  STATE_STUB
} from '../test/stubs/graph-layouts.stub.ts';
import { layoutsRigOf, resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { routeWithBends } from '../test/utils/route-bends.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';

const WEB_UI = edgeIdOf({ source: 'web', target: 'ui' });

const UI_CORE = edgeIdOf({ source: 'ui', target: 'core' });

const WEB_UI_ROUTE: EdgeRoute = routeWithBends(1);

const UI_CORE_ROUTE: EdgeRoute = routeWithBends(2);

const LONG_ROUTE: EdgeRoute = routeWithBends(ROUTE_BENDS_MAX + 1);

const FLAT_ROUTES: Routes = { [WEB_UI]: WEB_UI_ROUTE, [UI_CORE]: UI_CORE_ROUTE };

const FOLDER_ROUTES: Routes = { [WEB_UI]: UI_CORE_ROUTE, [UI_CORE]: WEB_UI_ROUTE };

const WEB_UI_ONLY: Routes = { [WEB_UI]: WEB_UI_ROUTE };

/** Both layouts cached with their routes. */
const ROUTED_BOTH: GraphReady = {
  ...STATE_STUB,
  routes: FLAT_ROUTES,
  folderPositions: GROUPED_POSITIONS_STUB,
  folderRoutes: FOLDER_ROUTES
};

const UNCACHED: GraphReady = { ...STATE_STUB, positions: null };

const UI_CORE_DRAG: GraphDrag = { positions: DRAGGED_POSITIONS_STUB, touched: [UI_CORE] };

const routedResultOf = (routes: Routes): LayoutResult => {
  const base = resultOf('h1', FLAT_POSITIONS_STUB);
  const result: LayoutResult = { ...base, routes };

  return result;
};

const UNTOUCHED_DRAG: GraphDrag = { positions: DRAGGED_POSITIONS_STUB, touched: [] };

const dragPostOf = (routes: Routes, grouping: LayoutGrouping = 'flat'): GraphWebviewMessage => {
  const post: GraphWebviewMessage = { type: 'positions', hash: 'h1', positions: DRAGGED_POSITIONS_STUB, routes, grouping };

  return post;
};

describe('FEATURE: GraphLayouts routes', () => {
  let rig: LayoutsRig;
  let layouts: GraphLayouts;

  const open = (state: GraphReady, saved = SAVED_FLAT_STUB): void => {
    rig.setDrawn(state);
    void layouts.show(state, saved);
  };

  const lastPost = (): unknown => rig.posts().at(-1);

  beforeEach((): void => {
    rig = layoutsRigOf();
    layouts = new GraphLayouts(rig.deps);
  });

  describe('GIVEN GraphReady routes for both modes', () => {
    it('WHEN shown flat from the cache THEN the folder links are re-labelled once, after setGraph', () => {
      open(ROUTED_BOTH);

      expect(rig.view.relinkFolders).toHaveBeenCalledOnce();
      expect(rig.view.setGraph).toHaveBeenCalledBefore(rig.view.relinkFolders);
    });

    it('WHEN shown grouped from the cache THEN the folder links are re-labelled once, after setGrouping', () => {
      open(ROUTED_BOTH, SAVED_GROUPED_STUB);

      expect(rig.view.relinkFolders).toHaveBeenCalledOnce();
      expect(rig.view.setGrouping).toHaveBeenCalledBefore(rig.view.relinkFolders);
    });

    it('WHEN switched to grouped THEN the folder links are re-labelled once, after setPositions', () => {
      open(ROUTED_BOTH);
      rig.view.relinkFolders.mockClear();

      void layouts.switchTo('folders');

      expect(rig.view.relinkFolders).toHaveBeenCalledOnce();
      expect(rig.view.setPositions).toHaveBeenCalledBefore(rig.view.relinkFolders);
    });
  });

  describe('GIVEN no layout cached', () => {
    it('WHEN an ELK result with routes lands THEN the folder links are re-labelled once', async () => {
      open(UNCACHED);
      await rig.runs.settle(0, routedResultOf(FLAT_ROUTES));

      expect(rig.view.relinkFolders).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN flat drawn from the cache with routes for web>ui and ui>core', () => {
    beforeEach((): void => {
      open(ROUTED_BOTH);
      rig.view.relinkFolders.mockClear();
    });

    it('WHEN dragged with ui>core touched THEN the folder links are re-labelled once', () => {
      layouts.dragged(UI_CORE_DRAG);

      expect(rig.view.relinkFolders).toHaveBeenCalledOnce();
    });

    it('WHEN dragged with ui>core touched THEN the post carries only web>ui', () => {
      layouts.dragged(UI_CORE_DRAG);

      expect(rig.posts()).toStrictEqual([dragPostOf(WEB_UI_ONLY)]);
    });

    it('WHEN Re-layout lands after the drag THEN the next drag posts every route again', async () => {
      layouts.dragged(UI_CORE_DRAG);

      void layouts.relayout();
      await rig.runs.settle(0, routedResultOf(FLAT_ROUTES));
      layouts.dragged(UNTOUCHED_DRAG);

      expect(lastPost()).toStrictEqual(dragPostOf(FLAT_ROUTES));
    });

    it('WHEN task mode is left and the package graph is redrawn THEN the next drag still posts only web>ui', async () => {
      layouts.dragged(UI_CORE_DRAG);

      await layouts.redraw(SAVED_FLAT_STUB);
      layouts.dragged(UNTOUCHED_DRAG);

      expect(lastPost()).toStrictEqual(dragPostOf(WEB_UI_ONLY));
    });
  });

  describe('GIVEN flat drawn with a web>ui route over ROUTE_BENDS_MAX', () => {
    it('WHEN dragged with ui>core touched THEN that route is not posted', () => {
      const long: Routes = { [WEB_UI]: LONG_ROUTE, [UI_CORE]: UI_CORE_ROUTE };
      const state: GraphReady = { ...STATE_STUB, routes: long };

      open(state);
      layouts.dragged(UI_CORE_DRAG);

      expect(rig.posts()).toStrictEqual([dragPostOf({})]);
    });
  });

  describe('GIVEN grouped drawn from the cache and dragged with ui>core touched', () => {
    it('WHEN switched to flat and back THEN the next drag posts folders still lacking the dragged route', () => {
      const foldersLeft: Routes = { [WEB_UI]: UI_CORE_ROUTE };

      open(ROUTED_BOTH, SAVED_GROUPED_STUB);
      layouts.dragged(UI_CORE_DRAG);
      void layouts.switchTo('flat');
      void layouts.switchTo('folders');
      layouts.dragged(UNTOUCHED_DRAG);

      expect(lastPost()).toStrictEqual(dragPostOf(foldersLeft, 'folders'));
    });
  });
});
