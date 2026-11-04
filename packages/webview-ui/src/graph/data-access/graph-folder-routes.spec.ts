import type { Core, EdgeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setBoxes } from './graph-boxes.ts';
import { createFoldersView } from './graph-folders-view.ts';
import { applyRoutes } from './graph-routes.ts';
import type { EdgeRoute, Position, Routes } from '../../bridge/common/graph-state.type.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import { ROUTED_CLASS } from '../common/graph-layout.const.ts';
import type { FoldersView } from '../common/graph-page.type.ts';
import { boardsCyMock, groupedCyMock } from '../test/mocks/folder-boards.mock.ts';
import { THREE_POSITIONS_STUB } from '../test/stubs/folder-boards.stub.ts';
import { THREE, THREE_EDGES, THREE_GROUPS, boardsSceneOf, sceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';
import { collapsedIdOf, folderLinkIdOf } from '../utils/folder-id.util.ts';

const labelOf = (folder: string): string => folder;

const UI = '@acme/ui';

const UI_AT: Position = { x: 120, y: 300 };

const APPS_CENTRE: Position = { x: 60, y: 0 };

/** The apps box is x -82..202, y -48..48: docs and web (100 by 32 at (0, 0) and (120, 0)) grown by 32. */
const INSIDE_APPS: Position = { x: 0, y: 30 };

const OUTSIDE_APPS: Position = { x: 120, y: 150 };

const DOCS_END: Position = { x: 120, y: 284 };

const DOCS_TO_UI = edgeIdOf({ source: 'docs', target: UI });

const DOCS_MOVED_AT: Position = { x: -200, y: 0 };

const WEB_MOVED_AT: Position = { x: -80, y: 0 };

const DOCS_START: Position = { x: 0, y: 16 };

const route = (bends: Position[]): EdgeRoute => {
  const routed: EdgeRoute = { start: DOCS_START, bends, end: DOCS_END };

  return routed;
};

const recordOf = (bends: Position[]): Routes => {
  const record: Routes = { [DOCS_TO_UI]: route(bends) };

  return record;
};

const MIXED_RECORD = recordOf([INSIDE_APPS, OUTSIDE_APPS]);

const INSIDE_ONLY_RECORD = recordOf([INSIDE_APPS]);

const APPS_TO_UI = folderLinkIdOf(collapsedIdOf('apps'), UI);

const linkToUi = (cy: Core): EdgeSingular => cy.getElementById(APPS_TO_UI);

describe('FEATURE: folder links drawn on their first member route', () => {
  let cy: Core;
  let folders: FoldersView;

  beforeEach(() => {
    cy = boardsCyMock();
    folders = createFoldersView(cy);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN apps collapsed after the record arrived, the first member with one bend inside the box and one outside', () => {
    beforeEach(() => {
      folders.setRoutes(MIXED_RECORD);
      folders.show(boardsSceneOf(['apps']), labelOf);
    });

    it('WHEN routed THEN the link is routed', () => {
      expect(linkToUi(cy).hasClass(ROUTED_CLASS)).toBe(true);
    });

    it('WHEN routed THEN only the outside bend is drawn', () => {
      const weights = String(linkToUi(cy).style('segment-weights')).split(' ');

      expect(weights).toHaveLength(1);
    });

    it('WHEN routed THEN that bend lies where the member route put it', () => {
      const edge = linkToUi(cy);
      const weight = parseFloat(String(edge.style('segment-weights')));
      const distance = parseFloat(String(edge.style('segment-distances')));
      const alongX = UI_AT.x - APPS_CENTRE.x;
      const alongY = UI_AT.y - APPS_CENTRE.y;
      const length = Math.hypot(alongX, alongY);
      const drawn: Position = {
        x: APPS_CENTRE.x + weight * alongX - (distance * alongY) / length,
        y: APPS_CENTRE.y + weight * alongY + (distance * alongX) / length
      };

      expect(drawn.x).toBeCloseTo(OUTSIDE_APPS.x, 0);
      expect(drawn.y).toBeCloseTo(OUTSIDE_APPS.y, 0);
    });

    it('WHEN routed THEN the collapsed end clips at the node and the outside end keeps the member offset', () => {
      const edge = linkToUi(cy);
      const ends: unknown[] = [edge.style('source-endpoint'), edge.style('target-endpoint')];

      expect(ends).toStrictEqual(['outside-to-node', `${DOCS_END.x - UI_AT.x}px ${DOCS_END.y - UI_AT.y}px`]);
    });

    it('WHEN the apps packages move and the folders recentre THEN the link is re-routed from the moved collapsed node', () => {
      const before = String(linkToUi(cy).style('segment-weights'));

      cy.getElementById('docs').position(DOCS_MOVED_AT);
      cy.getElementById('web').position(WEB_MOVED_AT);
      folders.recentre();

      expect(String(linkToUi(cy).style('segment-weights'))).not.toBe(before);
    });

    it('WHEN applyRoutes runs with the same record THEN the link goes straight', () => {
      applyRoutes(cy, MIXED_RECORD);

      expect(linkToUi(cy).hasClass(ROUTED_CLASS)).toBe(false);
    });

    it('WHEN applyRoutes runs with the same record and folders.setRoutes follows THEN the link is routed again', () => {
      applyRoutes(cy, MIXED_RECORD);
      folders.setRoutes(MIXED_RECORD);

      expect(linkToUi(cy).hasClass(ROUTED_CLASS)).toBe(true);
    });

    it('WHEN folders.setRoutes brings a record without the member THEN the link is straight', () => {
      folders.setRoutes({});

      expect(linkToUi(cy).hasClass(ROUTED_CLASS)).toBe(false);
    });

    it('WHEN the boxes go with their collapsed nodes and links and folders.setRoutes follows THEN it skips the removed links', () => {
      setBoxes(cy, null);

      expect(() => folders.setRoutes({})).not.toThrow();
    });
  });

  describe('GIVEN apps collapsed and every bend of the first member inside the box', () => {
    it('WHEN routed THEN the link is not routed', () => {
      folders.setRoutes(INSIDE_ONLY_RECORD);
      folders.show(boardsSceneOf(['apps']), labelOf);

      expect(linkToUi(cy).hasClass(ROUTED_CLASS)).toBe(false);
    });
  });
});

const routeOf = (start: Position, bend: Position, end: Position): EdgeRoute => {
  const routed: EdgeRoute = { start, bends: [bend], end };

  return routed;
};

const A_TO_B = routeOf({ x: 0, y: 16 }, { x: -150, y: 150 }, { x: 0, y: 284 });

const B_TO_C = routeOf({ x: 50, y: 284 }, { x: 250, y: 150 }, { x: 120, y: 16 });

const B_TO_D = routeOf({ x: 50, y: 300 }, { x: 150, y: 400 }, { x: 250, y: 300 });

/** The f1 box is x -82..202, y -48..48; the f3 box x 218..382, y 252..348. Each route keeps its one bend outside them. */
const THREE_RECORD: Routes = {
  [edgeIdOf({ source: 'a', target: 'b' })]: A_TO_B,
  [edgeIdOf({ source: 'b', target: 'c' })]: B_TO_C,
  [edgeIdOf({ source: 'b', target: 'd' })]: B_TO_D
};

const F1 = collapsedIdOf('f1');

/** The links f1 → b and b → f1, drawn while f1 is collapsed, whatever else collapses. */
const KEPT_LINK_IDS: string[] = [folderLinkIdOf(F1, 'b'), folderLinkIdOf('b', F1)];

const B_TO_F3 = folderLinkIdOf('b', collapsedIdOf('f3'));

const threeSceneOf = (collapsed: string[]): FolderScene => sceneOf(THREE, THREE_EDGES, { collapsed });

const isWrite = (args: unknown[]): boolean => typeof args[0] === 'object';

describe('FEATURE: a folder toggle re-draws only the folder links it changed', () => {
  let cy: Core;
  let folders: FoldersView;

  /** Watches `data()` on each kept link; reads the number of writes (route data is written as one object). */
  const watchKept = (): (() => number) => {
    const spies = KEPT_LINK_IDS.map((id) => vi.spyOn(cy.getElementById(id), 'data'));
    const writesOf = (spy: (typeof spies)[number]): number => spy.mock.calls.filter(isWrite).length;

    return (): number => spies.map(writesOf).reduce((sum, count) => sum + count, 0);
  };

  beforeEach(() => {
    cy = groupedCyMock(THREE_GROUPS, THREE_EDGES, THREE_POSITIONS_STUB);
    folders = createFoldersView(cy);
    folders.setRoutes(THREE_RECORD);
    folders.show(threeSceneOf(['f1']), labelOf);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN f1 collapsed with its two links routed', () => {
    it('WHEN f3 collapses too THEN the two kept links are not written again', () => {
      const writes = watchKept();

      folders.show(threeSceneOf(['f1', 'f3']), labelOf);

      expect(writes()).toBe(0);
    });

    it('WHEN f3 collapses too THEN its new link is routed', () => {
      folders.show(threeSceneOf(['f1', 'f3']), labelOf);

      expect(cy.getElementById(B_TO_F3).hasClass(ROUTED_CLASS)).toBe(true);
    });

    it('WHEN f1 expands and collapses again THEN its re-added links are routed', () => {
      folders.show(threeSceneOf([]), labelOf);
      folders.show(threeSceneOf(['f1']), labelOf);
      const routed = KEPT_LINK_IDS.map((id) => cy.getElementById(id).hasClass(ROUTED_CLASS));

      expect(routed).toStrictEqual([true, true]);
    });

    it('WHEN the folders recentre THEN both kept links are written again', () => {
      const writes = watchKept();

      folders.recentre();

      expect(writes()).toBe(2);
    });

    it('WHEN folders.setRoutes brings the same record THEN both kept links are written again', () => {
      const writes = watchKept();

      folders.setRoutes(THREE_RECORD);

      expect(writes()).toBe(2);
    });
  });
});
