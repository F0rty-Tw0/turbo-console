import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createFoldersView } from './graph-folders-view.ts';
import { probeFolderLinksOf, probeFoldersOf } from './graph-probe-folders.ts';
import { graphStyleOf } from './graph-style.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { ProbeRect } from '../common/graph-probe.type.ts';
import { FOLDER_LINK_CLASS, ROW_LESS_CLASS } from '../common/graph.const.ts';
import { boardsCyMock } from '../test/mocks/folder-boards.mock.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';
import { boardsSceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { collapsedIdOf } from '../utils/folder-id.util.ts';

const ORIGIN: Position = { x: 0, y: 0 };

const LABEL_OPTIONS = { includeLabels: true, includeEdges: false, includeNodes: false, includeOverlays: false };

const labelOf = (folder: string): string => `${folder}\n2 packages`;

describe('FEATURE: probeFoldersOf drawn label', () => {
  describe('GIVEN the boards styled with apps collapsed', () => {
    let cy: Core;

    const textOf = (folder: string): string | undefined =>
      probeFoldersOf(cy, ORIGIN).find((probed): boolean => probed.folder === folder)?.text;

    beforeEach(() => {
      cy = boardsCyMock();
      cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));
      createFoldersView(cy).show(boardsSceneOf(['apps']), labelOf);
    });

    afterEach(() => {
      cy.destroy();
    });

    it('WHEN its collapsed node shows its row THEN apps reads no drawn label', () => {
      expect(textOf('apps')).toBe('');
    });

    it('WHEN its collapsed node is row-less THEN apps reads the label the canvas draws', () => {
      cy.getElementById(collapsedIdOf('apps')).addClass(ROW_LESS_CLASS);

      expect(textOf('apps')).toBe('apps\n2 packages');
    });
  });
});

/** The label box of the first folder link of `cy`. */
const labelBoxOf = (cy: Core, origin: Position): ProbeRect => {
  const [first] = probeFolderLinksOf(cy, origin);

  if (first === undefined) throw new Error('no folder link is drawn');

  return first.labelBox;
};

describe('FEATURE: probeFolderLinksOf label box', () => {
  describe('GIVEN the boards styled with apps collapsed', () => {
    let cy: Core;

    beforeEach(() => {
      cy = boardsCyMock();
      cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));
      createFoldersView(cy).show(boardsSceneOf(['apps']), labelOf);
    });

    afterEach(() => {
      cy.destroy();
    });

    it('WHEN a folder link is read THEN its label box is the label bounds Cytoscape reports for the edge', () => {
      const edge = cy.edges(`.${FOLDER_LINK_CLASS}`).first();
      const { x1, x2, y1, y2 } = edge.renderedBoundingBox(LABEL_OPTIONS);

      expect(labelBoxOf(cy, ORIGIN)).toStrictEqual({ left: x1, top: y1, width: x2 - x1, height: y2 - y1 });
    });

    it('WHEN the container sits 10 px right of and 20 px below the page corner THEN the label box moves with it', () => {
      const atCorner = labelBoxOf(cy, ORIGIN);
      const moved = labelBoxOf(cy, { x: 10, y: 20 });

      expect(moved).toStrictEqual({ ...atCorner, left: atCorner.left + 10, top: atCorner.top + 20 });
    });
  });
});
