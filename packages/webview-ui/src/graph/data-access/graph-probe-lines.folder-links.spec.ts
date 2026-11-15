import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createFoldersView } from './graph-folders-view.ts';
import { folderLinkLinesOf } from './graph-probe-lines.ts';
import { FOLDER_HIDDEN_CLASS, FOLDER_LINK_CLASS } from '../common/graph.const.ts';
import { boardsCyMock } from '../test/mocks/folder-boards.mock.ts';
import { boardsSceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { collapsedIdOf } from '../utils/folder-id.util.ts';

describe('FEATURE: folderLinkLinesOf', () => {
  let cy: Core;

  beforeEach(() => {
    cy = boardsCyMock();
    createFoldersView(cy).show(boardsSceneOf(['apps']), (folder: string): string => folder);
    cy.edges(`.${FOLDER_LINK_CLASS}`).addClass(FOLDER_HIDDEN_CLASS);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN 4 package edges and 2 hidden folder links', () => {
    it('WHEN read THEN there are 2 lines, none of a package edge', () => {
      const lines = folderLinkLinesOf(cy, { x: 0, y: 0 });
      const sources = lines.map((line): string => line.source);

      expect(sources).toStrictEqual([collapsedIdOf('apps'), collapsedIdOf('apps')]);
    });

    it('WHEN read THEN each line is not drawn, has no points and names the raw ends', () => {
      const [first] = folderLinkLinesOf(cy, { x: 0, y: 0 });

      expect(first).toMatchObject({ target: '@acme/ui', isDrawn: false, points: [] });
    });
  });
});
