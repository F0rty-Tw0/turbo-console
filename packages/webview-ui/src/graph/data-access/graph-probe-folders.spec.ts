import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createFoldersView } from './graph-folders-view.ts';
import { probeFoldersOf } from './graph-probe-folders.ts';
import { graphStyleOf } from './graph-style.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import { ROW_LESS_CLASS } from '../common/graph.const.ts';
import { boardsCyMock } from '../test/mocks/folder-boards.mock.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';
import { boardsSceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { collapsedIdOf } from '../utils/folder-id.util.ts';

const ORIGIN: Position = { x: 0, y: 0 };

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
