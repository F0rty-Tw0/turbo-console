import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { controlsActionsOf } from './graph-controls-actions.ts';
import type { ControlsElements } from '../common/controls-elements.type.ts';
import type { ControlsMounted, ControlsOps } from '../common/graph-controls.type.ts';
import type { GraphFilters } from '../common/graph-filters.type.ts';
import type { DrawnGraph } from '../common/graph-page.type.ts';
import { boardsControlsMock } from '../test/mocks/boards-controls.mock.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { rowOf } from '../test/utils/controls-elements.spec.util.ts';
import { menuFiltersOf } from '../test/utils/widget-menu.spec.util.ts';

/** The boards panel after Show all was pressed, and the ops it called. */
type ShowAllRun = {
  readonly elements: ControlsElements;
  readonly ops: ControlsOps;
};

const GRAPH: DrawnGraph = { hash: 'h', packages: [], infos: [], edges: [] };

const WEB_HIDDEN = menuFiltersOf(['web'], null);

const opsOf = (applied: GraphFilters): ControlsOps => {
  const ops: ControlsOps = {
    applied,
    depth: applied.depth,
    edit: vi.fn(),
    change: vi.fn(),
    focus: vi.fn(),
    focusFolder: vi.fn(),
    clearFocus: vi.fn(),
    focusedFolder: (): string | null => null,
    setSearch: vi.fn(),
    setGrouping: vi.fn(),
    pick: vi.fn()
  };

  return ops;
};

const holdFocus = (elements: ControlsElements): void => elements.showAll.focus();

/** Gives the web checkbox the list's Tab stop, as `ControlsKeyboard` would, then hands focus to Show all. */
const holdFocusOverWebStop = (elements: ControlsElements): void => {
  rowOf(elements, 'web').check.setAttribute('tabindex', '0');
  holdFocus(elements);
};

const focusDepthOverWebStop = (elements: ControlsElements): void => {
  rowOf(elements, 'web').check.setAttribute('tabindex', '0');
  elements.depth.focus();
};

/** Builds the boards panel, runs `before` on it, then presses Show all over `applied`. */
const pressShowAll = (applied: GraphFilters, before: (elements: ControlsElements) => void): ShowAllRun => {
  const elements = boardsControlsMock();
  const mounted: ControlsMounted = { graph: GRAPH, elements };
  const ops = opsOf(applied);
  const actions = controlsActionsOf(mounted, ops, vi.fn());

  before(elements);
  actions.onShowAll();

  const run: ShowAllRun = { elements, ops };

  return run;
};

describe('FEATURE: controlsActionsOf Show all', () => {
  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN web hidden and Show all holding focus', () => {
    it('WHEN pressed while the web checkbox is the list Tab stop THEN the web checkbox holds focus', () => {
      const { elements } = pressShowAll(WEB_HIDDEN, holdFocusOverWebStop);

      expect(document.activeElement).toBe(rowOf(elements, 'web').check);
    });

    it('WHEN pressed while no list line is left to hold the Tab stop THEN the search box holds focus', () => {
      const { elements } = pressShowAll(WEB_HIDDEN, holdFocus);

      expect(document.activeElement).toBe(elements.search);
    });

    it('WHEN pressed THEN the filters change once', () => {
      const { ops } = pressShowAll(WEB_HIDDEN, holdFocus);

      expect(ops.change).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN web hidden and the depth field holding focus', () => {
    it('WHEN Show all is activated THEN the depth field keeps focus', () => {
      const { elements } = pressShowAll(WEB_HIDDEN, focusDepthOverWebStop);

      expect(document.activeElement).toBe(elements.depth);
    });
  });

  describe('GIVEN nothing filtered', () => {
    it('WHEN Show all is activated THEN the filters are left as they are', () => {
      const { ops } = pressShowAll(menuFiltersOf([], null), holdFocus);

      expect(ops.change).not.toHaveBeenCalled();
    });
  });
});
