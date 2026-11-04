import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createFoldersView } from './graph-folders-view.ts';
import type { EdgeRoute, Position, Routes } from '../../bridge/common/graph-state.type.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import { ROUTED_CLASS } from '../common/graph-layout.const.ts';
import type { FoldersView } from '../common/graph-page.type.ts';
import { groupedCyMock } from '../test/mocks/folder-boards.mock.ts';
import { THREE_POSITIONS_STUB } from '../test/stubs/folder-boards.stub.ts';
import { THREE, THREE_EDGES, THREE_GROUPS, sceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';
import { collapsedIdOf, folderLinkIdOf } from '../utils/folder-id.util.ts';

type ViewAction = (view: FoldersView) => void;

const labelOf = (folder: string): string => folder;

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

const recentre: ViewAction = (view) => view.recentre();

const setSameRoutes: ViewAction = (view) => view.setRoutes(THREE_RECORD);

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
    describe('WHEN f3 collapses too', () => {
      it('THEN the two kept links are not written again', () => {
        const writes = watchKept();

        folders.show(threeSceneOf(['f1', 'f3']), labelOf);

        expect(writes()).toBe(0);
      });

      it('THEN its new link is routed', () => {
        folders.show(threeSceneOf(['f1', 'f3']), labelOf);

        expect(cy.getElementById(B_TO_F3).hasClass(ROUTED_CLASS)).toBe(true);
      });
    });

    it('WHEN f1 expands and collapses again THEN its re-added links are routed', () => {
      folders.show(threeSceneOf([]), labelOf);
      folders.show(threeSceneOf(['f1']), labelOf);
      const routed = KEPT_LINK_IDS.map((id) => cy.getElementById(id).hasClass(ROUTED_CLASS));

      expect(routed).toStrictEqual([true, true]);
    });

    it.each([
      ['the folders recentre', recentre],
      ['folders.setRoutes brings the same record', setSameRoutes]
    ])('WHEN %s THEN both kept links are written again', (_, act) => {
      const writes = watchKept();

      act(folders);

      expect(writes()).toBe(2);
    });
  });
});
