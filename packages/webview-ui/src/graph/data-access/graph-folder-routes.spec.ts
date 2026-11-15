import type { Core, EdgeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setBoxes } from './graph-boxes.ts';
import { emptyDrawnLinks, routeFolderLinks } from './graph-folder-routes.ts';
import { createFoldersView } from './graph-folders-view.ts';
import { applyRoutes } from './graph-routes.ts';
import type { EdgeRoute, Position, Routes } from '../../bridge/common/graph-state.type.ts';
import type { FolderRouting } from '../common/folder-link-route.type.ts';
import { ROUTED_CLASS } from '../common/graph-layout.const.ts';
import type { FoldersView } from '../common/graph-page.type.ts';
import { boardsCyMock } from '../test/mocks/folder-boards.mock.ts';
import { boardsSceneOf, folderLinksByIdOf } from '../test/utils/folder-boards.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';
import { collapsedIdOf, folderLinkIdOf } from '../utils/folder-id.util.ts';

const labelOf = (folder: string): string => folder;

const UI = '@acme/ui';

/** The apps box is x -82..202, y -48..48: docs and web (100 by 32 at (0, 0) and (120, 0)) grown by 32. */
const INSIDE_APPS: Position = { x: 0, y: 30 };

const OUTSIDE_APPS: Position = { x: 120, y: 150 };

const DOCS_END: Position = { x: 120, y: 284 };

const DOCS_TO_UI = edgeIdOf({ source: 'docs', target: UI });

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

  describe('GIVEN apps collapsed on a headless Cytoscape, which has no renderer to measure labels with', () => {
    const scene = boardsSceneOf(['apps']);

    beforeEach(() => {
      folders.show(scene, labelOf);
    });

    it('WHEN the links are routed afresh THEN none of them waits for a label', () => {
      const links = folderLinksByIdOf(scene);
      const drawn = emptyDrawnLinks();
      const routing: FolderRouting = { members: scene.members, routes: MIXED_RECORD, drawn };

      routeFolderLinks(cy, links, routing);

      expect(drawn.unlabelled.size).toBe(0);
    });
  });
});
