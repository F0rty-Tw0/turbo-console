import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import { GraphModuleControls } from './graph-module-controls.ts';
import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { TaskModes } from '../common/graph-task.type.ts';
import type { ModuleControlsActions, ModuleControlsDeps, ModuleControlsElements } from '../common/module-controls.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { modulePanelViewsMock } from '../test/mocks/module-panel-views.mock.ts';
import { freshModulesViewOf } from '../utils/fresh-view-state.util.ts';

type ModuleControlsRig = {
  readonly deps: ModuleControlsDeps;
  readonly elements: ModuleControlsElements;
  readonly actions: Mocked<ModuleControlsActions>;
  readonly savePanels: Mock<TaskModes['savePanels']>;
};

const FRESH_WEB: ModulesViewState = freshModulesViewOf('web');

const WEB_FOCUSED: ModulesViewState = { ...FRESH_WEB, focus: 'file:src/a.ts', depth: 3 };

const rigOf = (): ModuleControlsRig => {
  const panelViews = modulePanelViewsMock();
  const elements = panelViews.views.controls();
  const page = {
    body: document.createElement('div'),
    controls: document.createElement('button'),
    packagesMode: document.createElement('button'),
    modeGroup: document.createElement('div')
  };
  const actions: Mocked<ModuleControlsActions> = { onDepth: vi.fn(), onShown: vi.fn(), onReset: vi.fn(), onClearFocus: vi.fn() };
  const savePanels = vi.fn<TaskModes['savePanels']>();
  const views = { controls: (): ModuleControlsElements => elements };
  const modes = { savePanels };
  const deps: ModuleControlsDeps = { page, views, modes, actions };
  const rig: ModuleControlsRig = { deps, elements, actions, savePanels };

  return rig;
};

const typeInto = (input: HTMLInputElement, text: string): void => {
  input.value = text;
  input.dispatchEvent(new Event('input'));
};

describe('FEATURE: module Controls panel', () => {
  let rig: ModuleControlsRig;
  let controls: GraphModuleControls;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    rig = rigOf();
    controls = new GraphModuleControls(rig.deps);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the panel built and entered with a fresh web view, open', () => {
    beforeEach(() => {
      controls.enter(FRESH_WEB, true);
    });

    it('WHEN it is entered THEN Controls points at graph-module-controls and the aside shows in the body', () => {
      const { panel } = rig.elements;

      expect([rig.deps.page.controls.getAttribute('aria-controls'), panel.isConnected, panel.hidden]).toStrictEqual([
        'graph-module-controls',
        true,
        false
      ]);
    });

    it('WHEN it is read THEN Focus reads None, Clear focus is hidden, depth reads 1 and only Test files is unchecked', () => {
      const { target, clearFocus, depth, types, tests, lazies } = rig.elements;

      expect([target.textContent, clearFocus.hidden, depth.value, types.checked, tests.checked, lazies.checked]).toStrictEqual([
        'None',
        true,
        '1',
        true,
        false,
        true
      ]);
    });

    it('WHEN setView carries focus file:src/a.ts at depth 3 THEN Focus reads src/a.ts, Clear focus shows, depth reads 3, and no action fired', () => {
      const { target, clearFocus, depth } = rig.elements;

      controls.setView(WEB_FOCUSED);

      expect([target.textContent, clearFocus.hidden, depth.value]).toStrictEqual(['src/a.ts', false, '3']);
      expect([rig.actions.onDepth.mock.calls, rig.actions.onShown.mock.calls]).toStrictEqual([[], []]);
    });

    it('WHEN setView carries test files shown THEN Test files is checked', () => {
      const shown: ModulesViewState['shown'] = { ...FRESH_WEB.shown, tests: true };

      controls.setView({ ...FRESH_WEB, shown });

      expect(rig.elements.tests.checked).toBe(true);
    });

    it.each(['0', '6', '2.5', ''])('WHEN depth %s is typed THEN onDepth is not called', (text) => {
      typeInto(rig.elements.depth, text);

      expect(rig.actions.onDepth).not.toHaveBeenCalled();
    });

    it('WHEN depth 4 is typed THEN onDepth gets 4', () => {
      typeInto(rig.elements.depth, '4');

      expect(rig.actions.onDepth.mock.calls).toStrictEqual([[4]]);
    });

    it('WHEN Test files is checked THEN onShown gets types, tests and lazies all shown', () => {
      const { tests } = rig.elements;

      tests.checked = true;
      tests.dispatchEvent(new Event('change'));

      expect(rig.actions.onShown.mock.calls).toStrictEqual([[{ types: true, tests: true, lazies: true }]]);
    });

    it('WHEN Reset view and Clear focus are clicked THEN onReset and onClearFocus fire once each', () => {
      rig.elements.reset.click();
      rig.elements.clearFocus.click();

      expect([rig.actions.onReset.mock.calls, rig.actions.onClearFocus.mock.calls]).toStrictEqual([[[]], [[]]]);
    });

    it('WHEN the Controls toggle is clicked THEN the aside hides, aria-expanded reads false and savePanels gets controlsOpen false', () => {
      rig.deps.page.controls.click();

      expect([rig.elements.panel.hidden, rig.deps.page.controls.getAttribute('aria-expanded')]).toStrictEqual([true, 'false']);
      expect(rig.savePanels.mock.calls).toStrictEqual([[{ controlsOpen: false }]]);
    });
  });

  describe('GIVEN the panel entered closed', () => {
    it('WHEN it is read THEN the aside is hidden and aria-expanded reads false', () => {
      controls.enter(FRESH_WEB, false);

      expect([rig.elements.panel.hidden, rig.deps.page.controls.getAttribute('aria-expanded')]).toStrictEqual([true, 'false']);
    });
  });

  describe('GIVEN the panel entered, then exited with focus on the depth input', () => {
    beforeEach(() => {
      controls.enter(FRESH_WEB, true);
      rig.elements.depth.focus();
      controls.exit();
    });

    it('WHEN it is exited THEN the aside hides, Controls points at graph-controls again and Packages has focus', () => {
      expect([rig.elements.panel.hidden, rig.deps.page.controls.getAttribute('aria-controls'), document.activeElement]).toStrictEqual([
        true,
        'graph-controls',
        rig.deps.page.packagesMode
      ]);
    });

    it('WHEN the Controls toggle is clicked after exit THEN nothing changes and savePanels is not called', () => {
      rig.deps.page.controls.click();

      expect([rig.elements.panel.hidden, rig.savePanels.mock.calls]).toStrictEqual([true, []]);
    });
  });

  describe('GIVEN the panel entered, then exited with focus outside it', () => {
    it('WHEN it is exited THEN focus stays where it was', () => {
      controls.enter(FRESH_WEB, true);
      rig.deps.page.controls.focus();

      controls.exit();

      expect(document.activeElement).toBe(rig.deps.page.controls);
    });
  });
});
