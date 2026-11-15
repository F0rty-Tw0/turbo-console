import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createFoldersView } from './graph-folders-view.ts';
import { probeFolderLinksOf } from './graph-probe-folders.ts';
import { graphStyleOf } from './graph-style.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { ProbeRect } from '../common/graph-probe-titles.type.ts';
import { boardsCyMock } from '../test/mocks/folder-boards.mock.ts';
import { CARD_MEASURES_STUB } from '../test/stubs/graph-card.stub.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';
import { boardsSceneOf } from '../test/utils/folder-boards.spec.util.ts';

const ORIGIN: Position = { x: 0, y: 0 };

const labelOf = (folder: string): string => `${folder}\n2 packages`;

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
      cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false, CARD_MEASURES_STUB));
      createFoldersView(cy).show(boardsSceneOf(['apps']), labelOf);
    });

    afterEach(() => {
      cy.destroy();
    });

    it('WHEN the container sits 10 px right of and 20 px below the page corner THEN the label box moves with it', () => {
      const atCorner = labelBoxOf(cy, ORIGIN);
      const moved = labelBoxOf(cy, { x: 10, y: 20 });

      expect(moved).toStrictEqual({ ...atCorner, left: atCorner.left + 10, top: atCorner.top + 20 });
    });

    it('WHEN the folder links are probed THEN each reads a bezier in the compound draw order', () => {
      const [first] = probeFolderLinksOf(cy, ORIGIN);

      expect(first).toMatchObject({ curveStyle: 'bezier', zCompoundDepth: 'auto' });
    });
  });
});
