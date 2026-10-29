import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WidgetRows } from './widget-rows.ts';
import type { WidgetRowsDeps } from '../common/graph-widgets.type.ts';
import type { FolderRowElements, RowKind, RowPlan } from '../common/widget.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { widgetRowViewsMock } from '../test/mocks/widget-row-views.mock.ts';
import { boardsSceneOf } from '../test/utils/folder-boards.spec.util.ts';

type RowsRig = {
  readonly rows: WidgetRows;
  /** The rows built so far, the latest last: apps collapsed, packages, then apps expanded. */
  readonly built: FolderRowElements[];
  readonly layer: HTMLElement;
};

const planOf = (folder: string, kind: RowKind): RowPlan => {
  const placement = { x: 0, y: 0, width: 200, scale: 1 };
  const plan: RowPlan = { folder, kind, placement, isChevronShown: true, isFocusShown: true, isEllipsisShown: true };

  return plan;
};

const rigOf = (): RowsRig => {
  const { views, built } = widgetRowViewsMock();
  const layer = document.createElement('div');
  const deps: WidgetRowsDeps = { layer, views, onToggle: vi.fn(), onTitle: vi.fn(), onFocus: vi.fn(), onMenu: vi.fn() };
  const rows = new WidgetRows(deps);
  const rig: RowsRig = { rows, built, layer };

  return rig;
};

/** The browser blurs a focused element whose row left the DOM: focus falls to the body. */
const loseFocus = (): void => document.body.focus();

/** Apps collapsed with its Focus folder focused, then apps expanded and rebuilt: the new box row is hidden, focus lost. */
const rebuiltWithLostFocus = (rig: RowsRig): void => {
  const { rows, built } = rig;
  const collapsedPlans = [planOf('apps', 'collapsed'), planOf('packages', 'box')];

  rows.sync(boardsSceneOf(['apps']), null);
  rows.place(collapsedPlans);
  built[0]?.focus.focus();
  rows.sync(boardsSceneOf([]), null);
  loseFocus();
  rows.place([planOf('packages', 'box')]);
  rows.restoreFocus();
};

describe('FEATURE: WidgetRows.restoreFocus', () => {
  let rig: RowsRig;

  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
    rig = rigOf();
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN a rebuilt row that is placed in the same pass', () => {
    it('WHEN focus is restored THEN the new row has focus on the same kind of button', () => {
      rig.rows.sync(boardsSceneOf(['apps']), null);
      rig.rows.place([planOf('apps', 'collapsed')]);
      rig.built[0]?.focus.focus();
      rig.rows.sync(boardsSceneOf([]), null);
      loseFocus();
      rig.rows.place([planOf('apps', 'box')]);

      rig.rows.restoreFocus();

      expect(document.activeElement).toBe(rig.built[2]?.focus);
    });
  });

  describe('GIVEN a rebuilt row that is still hidden and focus lost', () => {
    beforeEach((): void => {
      rebuiltWithLostFocus(rig);
    });

    it('WHEN the row is placed on a later refresh THEN the new row has focus', () => {
      rig.rows.place([planOf('apps', 'box')]);

      rig.rows.restoreFocus();

      expect(document.activeElement).toBe(rig.built[2]?.focus);
    });

    it('WHEN focus moved elsewhere and the row is placed on a later refresh THEN focus stays where it moved', () => {
      const elsewhere = document.createElement('button');

      elsewhere.focus();
      rig.rows.place([planOf('apps', 'box')]);

      rig.rows.restoreFocus();

      expect(document.activeElement).toBe(elsewhere);
    });
  });

  describe('GIVEN a request for apps while focus sits in a packages button when the rows reorder', () => {
    it('WHEN focus is restored THEN the packages button, which holds focus now, gets it', () => {
      const scene = boardsSceneOf([]);
      const reordered = { ...scene, shown: new Set(['packages', 'apps']) };
      const plans = [planOf('apps', 'box'), planOf('packages', 'box')];

      rebuiltWithLostFocus(rig);
      rig.built[1]?.chevron.focus();
      rig.rows.sync(reordered, null);
      loseFocus();
      rig.rows.place(plans);

      rig.rows.restoreFocus();

      expect(document.activeElement).toBe(rig.built[1]?.chevron);
    });
  });

  describe('GIVEN apps then packages shown', () => {
    it('WHEN the shown order turns to packages then apps THEN the layer holds their rows in that order, once each', () => {
      const scene = boardsSceneOf([]);
      const reordered = { ...scene, shown: new Set(['packages', 'apps']) };

      rebuiltWithLostFocus(rig);
      rig.rows.sync(reordered, null);

      expect([...rig.layer.children]).toStrictEqual([rig.built[1]?.root, rig.built[2]?.root]);
    });
  });
});
