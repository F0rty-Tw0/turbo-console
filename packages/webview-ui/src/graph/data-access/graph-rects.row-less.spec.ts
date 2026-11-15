import type { Core } from 'cytoscape';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { markRowLess } from './graph-rects.ts';
import { FOLDER_NODE_CLASS, ROW_LESS_CLASS } from '../common/graph.const.ts';
import type { RowKind, RowPlacement, RowPlan } from '../common/widget.type.ts';
import { boardsCyMock } from '../test/mocks/folder-boards.mock.ts';
import { collapsedIdOf } from '../utils/folder-id.util.ts';

const addCollapsed = (cy: Core, folder: string): void => {
  const data = { id: collapsedIdOf(folder), width: 180, height: 56 };
  const position = { x: 600, y: 600 };

  cy.add({ data, position, classes: FOLDER_NODE_CLASS });
};

const ROW_PLACEMENT: RowPlacement = { x: 108, y: 58, width: 164, scale: 1 };

const rowOf = (folder: string, kind: RowKind): RowPlan => {
  const row: RowPlan = { folder, kind, placement: ROW_PLACEMENT, isChevronShown: true, isFocusShown: true, isEllipsisShown: true };

  return row;
};

const isRowLess = (cy: Core, folder: string): boolean => cy.getElementById(collapsedIdOf(folder)).hasClass(ROW_LESS_CLASS);

describe('FEATURE: markRowLess', () => {
  describe('GIVEN the boards with apps and packages drawn as collapsed nodes', () => {
    let cy: Core;

    beforeEach(() => {
      cy = boardsCyMock();
      addCollapsed(cy, 'apps');
      addCollapsed(cy, 'packages');
    });

    it('WHEN only apps has a collapsed row THEN packages is row-less', () => {
      markRowLess(cy, [rowOf('apps', 'collapsed')]);

      expect(isRowLess(cy, 'packages')).toBe(true);
    });

    it('WHEN only apps has a collapsed row THEN apps is not row-less', () => {
      markRowLess(cy, [rowOf('apps', 'collapsed')]);

      expect(isRowLess(cy, 'apps')).toBe(false);
    });

    it('WHEN packages gets its row back THEN it is no longer row-less', () => {
      markRowLess(cy, []);

      markRowLess(cy, [rowOf('packages', 'collapsed')]);

      expect(isRowLess(cy, 'packages')).toBe(false);
    });

    it('WHEN the only row for apps is a box row THEN its collapsed node is row-less', () => {
      markRowLess(cy, [rowOf('apps', 'box')]);

      expect(isRowLess(cy, 'apps')).toBe(true);
    });

    it('WHEN marked again with the same rows THEN no node emits a class event, so the redraw does not loop', () => {
      const onClass = vi.fn<() => void>();

      markRowLess(cy, [rowOf('apps', 'collapsed')]);
      cy.on('class', onClass);

      markRowLess(cy, [rowOf('apps', 'collapsed')]);

      expect(onClass).not.toHaveBeenCalled();
    });
  });
});
