import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TaskToolbar } from './task-toolbar.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { TaskDetailsModel, TaskToolbarDeps } from '../common/task-details.type.ts';
import type { TaskToolbarElements } from '../common/task-toolbar.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { taskWidgetViewsMock } from '../test/mocks/task-widget-views.mock.ts';
import { API_BUILD_STUB, GRAPH_TASK_STUB, ROOT_BUILD_STUB } from '../test/stubs/graph-task.stub.ts';
import { accessLogOf } from '../test/utils/access-log.spec.util.ts';
import { pressKey } from '../test/utils/key-events.spec.util.ts';
import { isShownButton } from '../test/utils/package-toolbar.spec.util.ts';
import { rectOf } from '../test/utils/rect.spec.util.ts';

type ToolbarRig = {
  readonly toolbar: TaskToolbar;
  readonly layer: HTMLElement;
  readonly container: HTMLElement;
  readonly deps: TaskToolbarDeps;
  readonly built: TaskToolbarElements[];
};

type CountCase = {
  readonly title: string;
  readonly model: TaskDetailsModel;
  readonly zoom: number;
  readonly expected: number;
};

const rigOf = (): ToolbarRig => {
  const { page, views, toolbars: built } = taskWidgetViewsMock();
  const { widgets: layer, container } = page;
  const deps: TaskToolbarDeps = { layer, container, views, onMenu: vi.fn(), onRun: vi.fn(), onShowPackage: vi.fn() };
  const toolbar = new TaskToolbar(deps);
  const rig: ToolbarRig = { toolbar, layer, container, deps, built };

  return rig;
};

const latestOf = (rig: ToolbarRig): TaskToolbarElements => {
  const latest = rig.built.at(-1);

  if (latest === undefined) throw new Error('no toolbar was built');

  return latest;
};

/** The labels of the toolbar's buttons that are not hidden. */
const shownLabelsOf = (elements: TaskToolbarElements): (string | null)[] => {
  const { run, showPackage, ellipsis } = elements;
  const buttons = [run, showPackage, ellipsis];
  const shown = buttons.filter(isShownButton);

  return shown.map((button): string | null => button.getAttribute('aria-label'));
};

/** The Tab stops (`tabIndex`) of the buttons that exist, in toolbar order. */
const stopsOf = (elements: TaskToolbarElements): number[] => {
  const { run, showPackage, ellipsis } = elements;
  const buttons = [run, showPackage, ellipsis];
  const present = buttons.filter((button): button is HTMLButtonElement => button !== null);

  return present.map((button): number => button.tabIndex);
};

const AT_BUILD = rectOf(156, 22, 180, 46);

const COMPACT = 0.49;

const NOT_RUNNABLE_TASK: GraphTask = { ...GRAPH_TASK_STUB, isRunnable: false };

const ROOT_NOT_RUNNABLE_TASK: GraphTask = { ...ROOT_BUILD_STUB, isRunnable: false };

const IDLE: TaskDetailsModel = { task: GRAPH_TASK_STUB, state: null, dependencies: [], dependents: [], rootLabel: null };

const RUNNING: TaskDetailsModel = { ...IDLE, state: 'running' };

const PASSED: TaskDetailsModel = { ...IDLE, state: 'passed' };

const NOT_RUNNABLE: TaskDetailsModel = { ...IDLE, task: NOT_RUNNABLE_TASK };

const ROOT_IDLE: TaskDetailsModel = { ...IDLE, task: ROOT_BUILD_STUB };

const ROOT_NOT_RUNNABLE: TaskDetailsModel = { ...IDLE, task: ROOT_NOT_RUNNABLE_TASK };

const API_IDLE: TaskDetailsModel = { ...IDLE, task: API_BUILD_STUB };

const COUNT_CASES: CountCase[] = [
  { title: 'a runnable task at zoom 1', model: IDLE, zoom: 1, expected: 3 },
  { title: 'a task that is not runnable at zoom 1', model: NOT_RUNNABLE, zoom: 1, expected: 1 },
  { title: 'a root task that is not runnable at zoom 1', model: ROOT_NOT_RUNNABLE, zoom: 1, expected: 0 },
  { title: 'a runnable task at zoom 0.49', model: IDLE, zoom: COMPACT, expected: 1 },
  { title: 'a task that is not runnable at zoom 0.49', model: NOT_RUNNABLE, zoom: COMPACT, expected: 0 }
];

describe('FEATURE: TaskToolbar', () => {
  let rig: ToolbarRig;

  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
    rig = rigOf();
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the a#build toolbar is synced twice', () => {
    it('WHEN the layer is read THEN it holds the one root, the same element', () => {
      rig.toolbar.sync(IDLE);

      const first = rig.layer.children[0];

      rig.toolbar.sync(IDLE);

      expect(rig.layer.children).toHaveLength(1);
      expect(rig.layer.children[0]).toBe(first);
      expect(rig.toolbar.id()).toBe('a#build');
    });
  });

  describe('GIVEN the toolbar of a#build, then api#build is selected', () => {
    it('WHEN the layer is read THEN the old root is gone and the one new root is first', () => {
      rig.toolbar.sync(IDLE);

      const old = latestOf(rig).root;

      rig.layer.append(document.createElement('div'));
      rig.toolbar.sync(API_IDLE);

      expect(Array.from(rig.layer.children)).not.toContain(old);
      expect(rig.layer.children).toHaveLength(2);
      expect(rig.layer.children[0]).toBe(latestOf(rig).root);
      expect(rig.toolbar.id()).toBe('api#build');
    });

    it('WHEN the new toolbar is placed at zoom 1 THEN its Run is the Tab stop again', () => {
      rig.toolbar.sync(IDLE);
      rig.toolbar.place(AT_BUILD, COMPACT);
      rig.toolbar.sync(API_IDLE);
      rig.toolbar.place(AT_BUILD, 1);

      expect(latestOf(rig).run.tabIndex).toBe(0);
    });
  });

  describe('GIVEN focus on the "…" of the toolbar', () => {
    beforeEach((): void => {
      rig.toolbar.sync(IDLE);
      rig.toolbar.place(AT_BUILD, 1);
      latestOf(rig).ellipsis.focus();
    });

    it('WHEN the selection clears THEN the container has focus', () => {
      rig.toolbar.sync(null);

      expect(document.activeElement).toBe(rig.container);
      expect(rig.toolbar.id()).toBeNull();
    });

    it('WHEN the toolbar is placed at null THEN it hides and the container has focus', () => {
      rig.toolbar.place(null, 1);

      expect(latestOf(rig).root.hidden).toBe(true);
      expect(document.activeElement).toBe(rig.container);
    });
  });

  describe('GIVEN focus elsewhere', () => {
    it('WHEN the selection clears THEN focus stays there', () => {
      const other = document.createElement('button');

      rig.toolbar.sync(IDLE);
      other.focus();
      rig.toolbar.sync(null);

      expect(document.activeElement).toBe(other);
    });
  });

  describe('GIVEN the toolbar of a#build, idle', () => {
    beforeEach((): void => {
      rig.toolbar.sync(IDLE);
    });

    it('WHEN it is placed at a rect THEN it shows there on whole px', () => {
      rig.toolbar.place(AT_BUILD, 1);

      expect(latestOf(rig).root.hidden).toBe(false);
      expect(latestOf(rig).root.style.transform).toBe('translate(156px, 22px)');
    });

    it('WHEN it is placed at null THEN it is hidden', () => {
      rig.toolbar.place(AT_BUILD, 1);
      rig.toolbar.place(null, 1);

      expect(latestOf(rig).root.hidden).toBe(true);
    });

    it('WHEN the "…" is clicked THEN the menu opens on it', () => {
      const { ellipsis } = latestOf(rig);

      ellipsis.click();

      expect(rig.deps.onMenu).toHaveBeenCalledExactlyOnceWith(ellipsis);
    });

    it('WHEN it is placed twice at the same rect THEN the second pass writes and reads nothing', () => {
      const { root, run, showPackage, ellipsis } = latestOf(rig);

      rig.toolbar.place(AT_BUILD, 1);
      const log = accessLogOf([root, run, showPackage, ellipsis]);

      rig.toolbar.place(AT_BUILD, 1);

      expect(log).toStrictEqual([]);
    });

    it('WHEN it turns running THEN the same slot reads Stop a#build with the stop icon', () => {
      const { root, run } = latestOf(rig);

      rig.toolbar.sync(RUNNING);

      expect(latestOf(rig).root).toBe(root);
      expect(latestOf(rig).run).toBe(run);
      expect(run.getAttribute('aria-label')).toBe('Stop a#build');
      expect(run.title).toBe('Stop a#build');
      expect(run.children[0]?.className).toBe('codicon codicon-debug-stop');
    });

    it('WHEN it turns running, then passed THEN the same slot reads Run a#build with the play icon', () => {
      const { run } = latestOf(rig);

      rig.toolbar.sync(RUNNING);
      rig.toolbar.sync(PASSED);

      expect(latestOf(rig).run).toBe(run);
      expect(run.getAttribute('aria-label')).toBe('Run a#build');
      expect(run.children[0]?.className).toBe('codicon codicon-play');
    });

    it('WHEN Run has focus and the task turns running THEN the slot keeps focus', () => {
      rig.toolbar.place(AT_BUILD, 1);
      latestOf(rig).run.focus();
      rig.toolbar.sync(RUNNING);

      expect(document.activeElement).toBe(latestOf(rig).run);
    });

    it('WHEN Run is clicked THEN the task is run', () => {
      latestOf(rig).run.click();

      expect(rig.deps.onRun).toHaveBeenCalledExactlyOnceWith('a#build', 'run');
    });

    it('WHEN the task turns running and the slot is clicked THEN the task is stopped', () => {
      rig.toolbar.sync(RUNNING);
      latestOf(rig).run.click();

      expect(rig.deps.onRun).toHaveBeenCalledExactlyOnceWith('a#build', 'stop');
    });

    it('WHEN Show package is clicked THEN the package a is shown', () => {
      latestOf(rig).showPackage?.click();

      expect(rig.deps.onShowPackage).toHaveBeenCalledExactlyOnceWith('a');
    });

    it('WHEN it is placed at zoom 0.49 THEN only the "…" shows, as the Tab stop', () => {
      rig.toolbar.place(AT_BUILD, COMPACT);

      expect(shownLabelsOf(latestOf(rig))).toStrictEqual(['Actions for a#build']);
      expect(latestOf(rig).ellipsis.tabIndex).toBe(0);
    });

    it('WHEN Run has focus and it is placed at zoom 0.49 THEN the "…" has focus', () => {
      rig.toolbar.place(AT_BUILD, 1);
      latestOf(rig).run.focus();
      rig.toolbar.place(AT_BUILD, COMPACT);

      expect(document.activeElement).toBe(latestOf(rig).ellipsis);
    });
  });

  describe('GIVEN the toolbar of a#build, not runnable, with focus on Show package', () => {
    beforeEach((): void => {
      rig.toolbar.sync(NOT_RUNNABLE);
      rig.toolbar.place(AT_BUILD, 1);
      latestOf(rig).showPackage?.focus();
    });

    it('WHEN it is placed at zoom 0.49 THEN it hides and the container has focus', () => {
      rig.toolbar.place(AT_BUILD, COMPACT);

      expect(latestOf(rig).root.hidden).toBe(true);
      expect(document.activeElement).toBe(rig.container);
    });
  });

  describe('GIVEN the toolbar of the root task //#build', () => {
    it('WHEN its buttons are read THEN it has no Show package', () => {
      rig.toolbar.sync(ROOT_IDLE);

      expect(latestOf(rig).showPackage).toBeNull();
    });
  });

  describe('GIVEN the toolbar of a#build, placed at full zoom with Run focused', () => {
    beforeEach((): void => {
      rig.toolbar.sync(IDLE);
      rig.toolbar.place(AT_BUILD, 1);
      latestOf(rig).run.focus();
    });

    it('WHEN Right is pressed THEN Show package has focus and is the one Tab stop', () => {
      const { root, run, showPackage } = latestOf(rig);

      const isPrevented = pressKey(root, 'ArrowRight', run);

      expect(isPrevented).toBe(true);
      expect(document.activeElement).toBe(showPackage);
      expect(stopsOf(latestOf(rig))).toStrictEqual([-1, 0, -1]);
    });

    it('WHEN Left is pressed THEN the "…" has focus, wrapping', () => {
      pressKey(latestOf(rig).root, 'ArrowLeft', latestOf(rig).run);

      expect(document.activeElement).toBe(latestOf(rig).ellipsis);
    });

    it('WHEN End is pressed THEN the "…" has focus', () => {
      pressKey(latestOf(rig).root, 'End', latestOf(rig).run);

      expect(document.activeElement).toBe(latestOf(rig).ellipsis);
    });

    it('WHEN Home is pressed on the "…" THEN Run has focus', () => {
      const { root, run, ellipsis } = latestOf(rig);

      ellipsis.focus();
      pressKey(root, 'Home', ellipsis);

      expect(document.activeElement).toBe(run);
    });

    it('WHEN a is pressed THEN focus and the Tab stop stay and the key is not prevented', () => {
      const isPrevented = pressKey(latestOf(rig).root, 'a', latestOf(rig).run);

      expect(isPrevented).toBe(false);
      expect(document.activeElement).toBe(latestOf(rig).run);
      expect(stopsOf(latestOf(rig))).toStrictEqual([0, -1, -1]);
    });

    it('WHEN Right is pressed and the toolbar is placed again THEN the Tab stop stays on Show package', () => {
      pressKey(latestOf(rig).root, 'ArrowRight', latestOf(rig).run);
      rig.toolbar.place(AT_BUILD, 1);

      expect(stopsOf(latestOf(rig))).toStrictEqual([-1, 0, -1]);
    });

    it('WHEN the "…" gains focus (a click) THEN it is the Tab stop', () => {
      latestOf(rig).ellipsis.focus();

      expect(stopsOf(latestOf(rig))).toStrictEqual([-1, -1, 0]);
    });
  });

  describe('GIVEN the toolbar of the root task //#build, placed with Run focused', () => {
    it('WHEN Right is pressed THEN the "…" has focus, as there is no Show package', () => {
      rig.toolbar.sync(ROOT_IDLE);
      rig.toolbar.place(AT_BUILD, 1);
      latestOf(rig).run.focus();
      pressKey(latestOf(rig).root, 'ArrowRight', latestOf(rig).run);

      expect(document.activeElement).toBe(latestOf(rig).ellipsis);
    });
  });

  describe('GIVEN a toolbar synced for each case', () => {
    it.each(COUNT_CASES)('WHEN $title is counted THEN it shows $expected buttons', ({ model, zoom, expected }) => {
      rig.toolbar.sync(model);

      expect(rig.toolbar.countAt(zoom)).toBe(expected);
    });
  });

  describe('GIVEN no toolbar', () => {
    it('WHEN it is placed THEN nothing happens and it has no "…"', () => {
      expect(() => rig.toolbar.place(AT_BUILD, 1)).not.toThrow();
      expect(rig.toolbar.ellipsis()).toBeNull();
    });

    it('WHEN it is counted THEN it shows no button', () => {
      expect(rig.toolbar.countAt(1)).toBe(0);
    });
  });
});
