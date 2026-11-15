import type { Core, EdgeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setBoxes } from './graph-boxes.ts';
import { emptyDrawnLinks, markFolderLinks } from './graph-folder-routes.ts';
import { createFoldersView } from './graph-folders-view.ts';
import type { FoldersView } from '../common/graph-page.type.ts';
import { boardsCyMock } from '../test/mocks/folder-boards.mock.ts';
import { boardsSceneOf, folderLinksByIdOf } from '../test/utils/folder-boards.spec.util.ts';
import { collapsedIdOf, folderLinkIdOf } from '../utils/folder-id.util.ts';

const labelOf = (folder: string): string => folder;

const APPS_TO_UI = folderLinkIdOf(collapsedIdOf('apps'), '@acme/ui');

const linkToUi = (cy: Core): EdgeSingular => cy.getElementById(APPS_TO_UI);

/** What a link would carry to be drawn on a route: the segment data and its endpoints. */
const routeDataOf = (link: EdgeSingular): unknown[] => [link.data('segWeights'), link.data('srcEnd'), link.data('tgtEnd')];

describe('FEATURE: folder links drawn plain, from card to card', () => {
  let cy: Core;
  let folders: FoldersView;

  beforeEach(() => {
    cy = boardsCyMock();
    folders = createFoldersView(cy);
    folders.show(boardsSceneOf(['apps']), labelOf);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN apps collapsed', () => {
    it('WHEN shown THEN the link carries no route data', () => {
      expect(routeDataOf(linkToUi(cy))).toStrictEqual([undefined, undefined, undefined]);
    });

    it('WHEN folders.relinkFolders runs THEN the link still carries no route data', () => {
      folders.relinkFolders();

      expect(routeDataOf(linkToUi(cy))).toStrictEqual([undefined, undefined, undefined]);
    });

    it('WHEN the boxes go with their collapsed nodes and links and folders.relinkFolders follows THEN it skips the removed links', () => {
      setBoxes(cy, null);

      expect(() => folders.relinkFolders()).not.toThrow();
    });
  });

  describe('GIVEN apps collapsed on a headless Cytoscape, which has no renderer to measure labels with', () => {
    it('WHEN the links are marked afresh THEN none of them waits for a label', () => {
      const links = folderLinksByIdOf(boardsSceneOf(['apps']));
      const drawn = emptyDrawnLinks();

      markFolderLinks(cy, links, drawn);

      expect(drawn.unlabelled.size).toBe(0);
    });
  });
});
