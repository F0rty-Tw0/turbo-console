import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mocked } from 'vitest';

import { GraphTaskControls } from './graph-task-controls.ts';
import { TASK_CONTROLS_ID } from '../common/graph-task.const.ts';
import { CONTROLS_ID } from '../common/graph.const.ts';
import type { TaskControlsActions, TaskControlsDeps, TaskControlsElements, TaskViewChecks } from '../common/task-controls.type.ts';
import type { TaskGridRow } from '../common/task-grid.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { taskControlsViewsMock } from '../test/mocks/task-controls-views.mock.ts';
import { TASK_VIEW_STUB } from '../test/stubs/graph-task.stub.ts';
import { TASK_GRID_FACTS_STUB } from '../test/stubs/task-grid.stub.ts';
import { childAt } from '../test/utils/html-child.spec.util.ts';

type ControlsRig = {
  readonly deps: TaskControlsDeps;
  readonly actions: Mocked<TaskControlsActions>;
  readonly elements: TaskControlsElements;
  /** The rows built so far, the latest last. */
  readonly rows: TaskGridRow[];
};

const rigOf = (): ControlsRig => {
  const { views, elements, rows } = taskControlsViewsMock();
  const page = {
    body: document.createElement('div'),
    controls: document.createElement('button'),
    packagesMode: document.createElement('button'),
    modeGroup: document.createElement('div')
  };
  const actions: Mocked<TaskControlsActions> = {
    onSearch: vi.fn(),
    onDepth: vi.fn(),
    onPick: vi.fn(),
    onToggle: vi.fn(),
    onGrouping: vi.fn(),
    onViewToggle: vi.fn()
  };
  const deps: TaskControlsDeps = { page, views, actions };
  const rig: ControlsRig = { deps, actions, elements, rows };

  return rig;
};

const checkAt = (list: HTMLElement, index: number): HTMLElement => childAt(childAt(childAt(list, index), 0), 0);

const nameAt = (list: HTMLElement, index: number): HTMLElement => childAt(childAt(childAt(list, index), 1), 0);

const typeInto = (input: HTMLInputElement, text: string): void => {
  input.value = text;
  input.dispatchEvent(new Event('input'));
};

const CHECKS: TaskViewChecks = { grouped: true, canGroup: true, scopeShown: false, scriptsShown: true, hasScripts: true };

/** What the user does to a checkbox: sets it, then the input event follows. */
const tick = (box: HTMLInputElement, isChecked: boolean): void => {
  box.checked = isChecked;
  box.dispatchEvent(new Event('input'));
};

describe('FEATURE: GraphTaskControls', () => {
  let rig: ControlsRig;
  let controls: GraphTaskControls;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    rig = rigOf();
    controls = new GraphTaskControls(rig.deps);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GIVEN task mode is off WHEN Controls is clicked THEN nothing is passed on', () => {
    rig.deps.page.controls.click();

    expect(rig.actions.onToggle).not.toHaveBeenCalled();
  });

  describe('GIVEN task mode entered open with the grid listed', () => {
    beforeEach(() => {
      controls.enter(TASK_VIEW_STUB, true);
      controls.setProjects(TASK_GRID_FACTS_STUB);
    });

    it('WHEN entered THEN the shown panel is mounted and Controls points at it, expanded', () => {
      expect(rig.deps.page.body.children[0]).toBe(rig.elements.panel);
      expect(rig.elements.panel.hidden).toBe(false);
      expect(rig.deps.page.controls.getAttribute('aria-controls')).toBe(TASK_CONTROLS_ID);
      expect(rig.deps.page.controls.getAttribute('aria-expanded')).toBe('true');
    });

    it('WHEN listed THEN the project rows are in the grid and the first check is the one Tab stop', () => {
      expect(rig.elements.list.children).toHaveLength(6);
      expect(checkAt(rig.elements.list, 0).tabIndex).toBe(0);
    });

    it('WHEN web is searched THEN only the web project is listed and the search is passed on', () => {
      typeInto(rig.elements.search, 'web');

      expect(rig.elements.list.children).toHaveLength(1);
      expect(nameAt(rig.elements.list, 0).title).toBe('web (2)');
      expect(rig.actions.onSearch).toHaveBeenCalledExactlyOnceWith('web');
    });

    it('WHEN a drawn task name is clicked THEN its task is picked', () => {
      nameAt(rig.elements.list, 4).click();
      nameAt(rig.elements.list, 5).click();

      expect(rig.actions.onPick).toHaveBeenCalledExactlyOnceWith('ui#build');
    });

    it.each([
      { typed: '3', expected: [[3]] },
      { typed: '9', expected: [] },
      { typed: '1.5', expected: [] }
    ])('WHEN depth $typed is typed THEN the depths passed on are $expected', ({ typed, expected }) => {
      typeInto(rig.elements.depth, typed);

      expect(rig.actions.onDepth.mock.calls).toStrictEqual(expected);
    });

    it('WHEN Controls is clicked THEN the panel hides and the closed state is passed on', () => {
      rig.deps.page.controls.click();

      expect(rig.elements.panel.hidden).toBe(true);
      expect(rig.deps.page.controls.getAttribute('aria-expanded')).toBe('false');
      expect(rig.actions.onToggle).toHaveBeenCalledExactlyOnceWith(false);
    });

    it('WHEN task mode is left with focus on a grid cell THEN the panel hides, Controls points back and Packages takes focus', () => {
      checkAt(rig.elements.list, 0).focus();
      controls.exit();

      expect(rig.elements.panel.hidden).toBe(true);
      expect(rig.deps.page.controls.getAttribute('aria-controls')).toBe(CONTROLS_ID);
      expect(document.activeElement).toBe(rig.deps.page.packagesMode);
    });

    describe('AND the mode group hidden', () => {
      it('WHEN task mode is left with focus on a grid cell THEN Controls takes focus', () => {
        rig.deps.page.modeGroup.hidden = true;
        checkAt(rig.elements.list, 0).focus();
        controls.exit();

        expect(document.activeElement).toBe(rig.deps.page.controls);
      });
    });

    it('WHEN nothing in the grid has focus and the facts are set again THEN focus stays where it was', () => {
      rig.deps.page.packagesMode.focus();
      controls.setProjects(TASK_GRID_FACTS_STUB);

      expect(document.activeElement).toBe(rig.deps.page.packagesMode);
    });
  });

  describe('GIVEN task mode entered with the View boxes', () => {
    beforeEach(() => {
      controls.enter(TASK_VIEW_STUB, true);
    });

    it('WHEN the user ticks Group by folder THEN onGrouping is called once with true', () => {
      tick(rig.elements.grouping, true);

      expect(rig.actions.onGrouping).toHaveBeenCalledExactlyOnceWith(true);
    });

    it('WHEN the user unticks Show package scopes THEN onViewToggle is called once with scope and false', () => {
      tick(rig.elements.scope, false);

      expect(rig.actions.onViewToggle).toHaveBeenCalledExactlyOnceWith('scope', false);
    });

    it('WHEN the user ticks Show scripts THEN onViewToggle is called once with scripts and true', () => {
      tick(rig.elements.scripts, true);

      expect(rig.actions.onViewToggle).toHaveBeenCalledExactlyOnceWith('scripts', true);
    });

    it('WHEN setView runs THEN the boxes read the checks', () => {
      controls.setView(CHECKS);

      const { grouping, scope, scripts } = rig.elements;

      expect([grouping.checked, scope.checked, scripts.checked]).toStrictEqual([true, false, true]);
    });

    it('WHEN setView runs THEN no action is called', () => {
      controls.setView(CHECKS);

      const calls = [rig.actions.onGrouping.mock.calls.length, rig.actions.onViewToggle.mock.calls.length];

      expect(calls).toStrictEqual([0, 0]);
    });

    it('WHEN setView runs with a script listed THEN Show scripts is shown', () => {
      controls.setView(CHECKS);

      expect(rig.elements.scriptsField.hidden).toBe(false);
    });

    it('WHEN setView runs with no script listed THEN Show scripts is hidden even though scriptsShown is true', () => {
      controls.setView({ ...CHECKS, hasScripts: false });

      expect(rig.elements.scriptsField.hidden).toBe(true);
    });

    it('WHEN setView runs with canGroup false THEN Group by folder is hidden', () => {
      controls.setView({ ...CHECKS, canGroup: false });

      expect(rig.elements.groupingField.hidden).toBe(true);
    });

    it('WHEN setView runs with canGroup true after a hidden state THEN Group by folder shows again', () => {
      controls.setView({ ...CHECKS, canGroup: false });
      controls.setView(CHECKS);

      expect(rig.elements.groupingField.hidden).toBe(false);
    });
  });
});
