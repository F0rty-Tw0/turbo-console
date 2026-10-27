import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mocked } from 'vitest';

import { GraphTaskControls } from './graph-task-controls.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import { TASK_CONTROLS_ID } from '../common/graph-task.const.ts';
import { CONTROLS_ID } from '../common/graph.const.ts';
import type { TaskControlsActions, TaskControlsDeps, TaskControlsElements, TaskControlsRow } from '../common/task-controls.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { taskControlsViewsMock } from '../test/mocks/task-controls-views.mock.ts';
import { TASK_CHAIN_STUB, TASK_VIEW_STUB, WEB_BUILD_STUB, WEB_LINT_STUB } from '../test/stubs/graph-task.stub.ts';
import { pressKey } from '../test/utils/key-events.spec.util.ts';

type ControlsRig = {
  readonly deps: TaskControlsDeps;
  readonly actions: Mocked<TaskControlsActions>;
  readonly elements: TaskControlsElements;
  /** The rows built so far, the latest last. */
  readonly rows: TaskControlsRow[];
};

/** `web#lint` then `web#build`: `api#build` dropped from the list and `web#build` no longer first. */
const WEB_TASKS: GraphTask[] = [WEB_LINT_STUB, WEB_BUILD_STUB];

const rigOf = (): ControlsRig => {
  const { views, elements, rows } = taskControlsViewsMock();
  const page = {
    body: document.createElement('div'),
    controls: document.createElement('button'),
    packagesMode: document.createElement('button'),
    modeGroup: document.createElement('div')
  };
  const actions: Mocked<TaskControlsActions> = { onSearch: vi.fn(), onDepth: vi.fn(), onPick: vi.fn(), onToggle: vi.fn() };
  const deps: TaskControlsDeps = { page, views, actions };
  const rig: ControlsRig = { deps, actions, elements, rows };

  return rig;
};

const tabStopsOf = (rows: TaskControlsRow[]): string[] => {
  const stops = rows.filter((row) => row.pick.tabIndex === 0);

  return stops.map((row) => row.task.id);
};

/** The id of the row whose button has focus, if any. */
const focusedIdOf = (rows: TaskControlsRow[]): string | undefined => {
  const focused = rows.find((row) => row.pick === document.activeElement);

  return focused?.task.id;
};

const typeInto = (input: HTMLInputElement, text: string): void => {
  input.value = text;
  input.dispatchEvent(new Event('input'));
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

  describe('GIVEN task mode entered open with the chain listed', () => {
    beforeEach(() => {
      controls.enter(TASK_VIEW_STUB, true);
      controls.setRows(TASK_CHAIN_STUB);
    });

    it('WHEN entered THEN the shown panel is mounted and Controls points at it, expanded', () => {
      expect(rig.deps.page.body.children[0]).toBe(rig.elements.panel);
      expect(rig.elements.panel.hidden).toBe(false);
      expect(rig.deps.page.controls.getAttribute('aria-controls')).toBe(TASK_CONTROLS_ID);
      expect(rig.deps.page.controls.getAttribute('aria-expanded')).toBe('true');
    });

    it('WHEN listed THEN the first row is the one Tab stop', () => {
      expect(tabStopsOf(rig.rows)).toStrictEqual(['api#build']);
    });

    it('WHEN web is searched THEN only the web rows show, the first of them the Tab stop, and the search is passed on', () => {
      typeInto(rig.elements.search, 'web');

      const shown = rig.rows.filter((row) => !row.line.hidden);

      expect(shown.map((row) => row.task.id)).toStrictEqual(['web#build', 'web#lint']);
      expect(tabStopsOf(rig.rows)).toStrictEqual(['web#build']);
      expect(rig.actions.onSearch).toHaveBeenCalledExactlyOnceWith('web');
    });

    it('WHEN ArrowDown is pressed on the first row THEN the second row takes focus and the Tab stop', () => {
      const first = rig.rows[0]?.pick;
      const isPrevented = pressKey(rig.elements.list, 'ArrowDown', first);

      expect(isPrevented).toBe(true);
      expect(focusedIdOf(rig.rows)).toBe('web#build');
      expect(tabStopsOf(rig.rows)).toStrictEqual(['web#build']);
    });

    it('WHEN End is pressed on the first row THEN the last row takes focus', () => {
      pressKey(rig.elements.list, 'End', rig.rows[0]?.pick);

      expect(focusedIdOf(rig.rows)).toBe('web#lint');
    });

    it('WHEN a key is pressed off the rows THEN focus stays and the default runs', () => {
      const isPrevented = pressKey(rig.elements.list, 'Home', rig.elements.list);

      expect(isPrevented).toBe(false);
      expect(focusedIdOf(rig.rows)).toBeUndefined();
    });

    it('WHEN a row is clicked THEN its task is picked', () => {
      rig.rows[1]?.pick.click();

      expect(rig.actions.onPick).toHaveBeenCalledExactlyOnceWith('web#build');
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

    it('WHEN task mode is left with focus on a row THEN the panel hides, Controls points back and Packages takes focus', () => {
      rig.rows[0]?.pick.focus();
      controls.exit();

      expect(rig.elements.panel.hidden).toBe(true);
      expect(rig.deps.page.controls.getAttribute('aria-controls')).toBe(CONTROLS_ID);
      expect(document.activeElement).toBe(rig.deps.page.packagesMode);
    });

    it('GIVEN the mode group hidden WHEN task mode is left with focus on a row THEN Controls takes focus', () => {
      rig.deps.page.modeGroup.hidden = true;
      rig.rows[0]?.pick.focus();
      controls.exit();

      expect(document.activeElement).toBe(rig.deps.page.controls);
    });

    describe('WHEN web#build has focus and the rows are listed again', () => {
      beforeEach(() => {
        rig.rows[1]?.pick.focus();
        controls.setRows(WEB_TASKS);
      });

      it('THEN the new web#build row takes focus', () => {
        expect(document.activeElement).toBe(rig.rows[4]?.pick);
      });

      it('THEN the new web#build row is the one Tab stop', () => {
        expect(tabStopsOf(rig.rows.slice(3))).toStrictEqual(['web#build']);
      });
    });

    it('WHEN nothing in the list has focus and the rows are listed again THEN focus stays where it was', () => {
      rig.deps.page.packagesMode.focus();
      controls.setRows(WEB_TASKS);

      expect(document.activeElement).toBe(rig.deps.page.packagesMode);
    });
  });
});
