import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TaskToolbar } from './task-toolbar.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { TaskDetailsModel } from '../common/task-details.type.ts';
import type { TaskToolbarElements } from '../common/task-toolbar.type.ts';
import type { TaskToolbarRig } from '../test/common/task-toolbar.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { API_BUILD_STUB, GRAPH_TASK_STUB, ROOT_BUILD_STUB } from '../test/stubs/graph-task.stub.ts';
import { TASK_DETAILS_STUB } from '../test/stubs/task-details.stub.ts';
import { accessLogOf } from '../test/utils/access-log.spec.util.ts';
import { isShownButton, taskButtonsOf } from '../test/utils/node-toolbar.spec.util.ts';
import { rectOf } from '../test/utils/rect.spec.util.ts';
import { latestOf, stopsOf, taskToolbarRigOf } from '../test/utils/task-toolbar.spec.util.ts';

type CountCase = {
  readonly title: string;
  readonly model: TaskDetailsModel;
  readonly zoom: number;
  readonly expected: number;
};

/** The labels of the toolbar's buttons that are not hidden. */
const shownLabelsOf = (elements: TaskToolbarElements): (string | null)[] => {
  const shown = taskButtonsOf(elements).filter(isShownButton);

  return shown.map((button): string | null => button.getAttribute('aria-label'));
};

const AT_BUILD = rectOf(156, 22, 180, 46);

const COMPACT = 0.49;

const NOT_RUNNABLE_TASK: GraphTask = { ...GRAPH_TASK_STUB, isRunnable: false };

const ROOT_NOT_RUNNABLE_TASK: GraphTask = { ...ROOT_BUILD_STUB, isRunnable: false };

const IDLE = TASK_DETAILS_STUB;

const RUNNING: TaskDetailsModel = { ...IDLE, state: 'running' };

const PASSED: TaskDetailsModel = { ...IDLE, state: 'passed' };

const NOT_RUNNABLE: TaskDetailsModel = { ...IDLE, task: NOT_RUNNABLE_TASK };

const NOT_RUNNABLE_CONTINUOUS: TaskDetailsModel = { ...NOT_RUNNABLE, state: 'continuous' };

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
  let rig: TaskToolbarRig;
  let toolbar: TaskToolbar;

  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
    rig = taskToolbarRigOf();
    toolbar = new TaskToolbar(rig.deps);
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the a#build toolbar is synced twice', () => {
    it('WHEN the layer is read THEN it holds the one root, the same element', () => {
      toolbar.sync(IDLE);

      const first = rig.layer.children[0];

      toolbar.sync(IDLE);

      const id = toolbar.id();

      expect(rig.layer.children).toHaveLength(1);
      expect(rig.layer.children[0]).toBe(first);
      expect(id).toBe('a#build');
    });
  });

  describe('GIVEN the toolbar of a#build, then api#build is selected', () => {
    it('WHEN the layer is read THEN the old root is gone and the one new root is first', () => {
      toolbar.sync(IDLE);

      const old = latestOf(rig).root;

      rig.layer.append(document.createElement('div'));
      toolbar.sync(API_IDLE);

      expect(Array.from(rig.layer.children)).not.toContain(old);
      expect(rig.layer.children).toHaveLength(2);
      expect(rig.layer.children[0]).toBe(latestOf(rig).root);
      expect(toolbar.id()).toBe('api#build');
    });

    it('WHEN the old "…" was the Tab stop and the new toolbar is placed at zoom 1 THEN its Run is the Tab stop', () => {
      toolbar.sync(IDLE);
      toolbar.place(AT_BUILD, 1);
      latestOf(rig).ellipsis.focus();
      toolbar.sync(API_IDLE);
      toolbar.place(AT_BUILD, 1);

      const stops = stopsOf(latestOf(rig));

      expect(stops).toStrictEqual([0, -1, -1]);
    });
  });

  describe('GIVEN focus on the "…" of the toolbar', () => {
    beforeEach((): void => {
      toolbar.sync(IDLE);
      toolbar.place(AT_BUILD, 1);
      latestOf(rig).ellipsis.focus();
    });

    it('WHEN the selection clears THEN the container has focus', () => {
      toolbar.sync(null);

      expect(document.activeElement).toBe(rig.container);
      expect(toolbar.id()).toBeNull();
    });

    it('WHEN the toolbar is placed at null THEN it hides and the container has focus', () => {
      toolbar.place(null, 1);

      expect(latestOf(rig).root.hidden).toBe(true);
      expect(document.activeElement).toBe(rig.container);
    });
  });

  describe('GIVEN focus elsewhere', () => {
    it('WHEN the selection clears THEN focus stays there', () => {
      const other = document.createElement('button');

      toolbar.sync(IDLE);
      other.focus();
      toolbar.sync(null);

      expect(document.activeElement).toBe(other);
    });
  });

  describe('GIVEN the toolbar of a#build, idle', () => {
    beforeEach((): void => {
      toolbar.sync(IDLE);
    });

    it('WHEN it is placed at a rect THEN it shows there on whole px', () => {
      toolbar.place(AT_BUILD, 1);

      expect(latestOf(rig).root.hidden).toBe(false);
      expect(latestOf(rig).root.style.transform).toBe('translate(156px, 22px)');
    });

    it('WHEN it is placed at null THEN it is hidden', () => {
      toolbar.place(AT_BUILD, 1);
      toolbar.place(null, 1);

      expect(latestOf(rig).root.hidden).toBe(true);
    });

    it('WHEN the "…" is clicked THEN the menu opens on it', () => {
      const { ellipsis } = latestOf(rig);

      ellipsis.click();

      expect(rig.deps.onMenu).toHaveBeenCalledExactlyOnceWith(ellipsis);
    });

    it('WHEN it is placed twice at the same rect THEN the second pass writes and reads nothing', () => {
      const { root, run, showPackage, ellipsis } = latestOf(rig);

      toolbar.place(AT_BUILD, 1);
      const log = accessLogOf([root, run, showPackage, ellipsis]);

      toolbar.place(AT_BUILD, 1);

      expect(log).toStrictEqual([]);
    });

    it('WHEN it turns running THEN the same slot reads Stop a#build with the stop icon', () => {
      const { root, run } = latestOf(rig);

      toolbar.sync(RUNNING);

      expect(latestOf(rig).root).toBe(root);
      expect(latestOf(rig).run).toBe(run);
      expect(run.getAttribute('aria-label')).toBe('Stop a#build');
      expect(run.title).toBe('Stop a#build');
      expect(run.children[0]?.className).toBe('codicon codicon-debug-stop');
    });

    it('WHEN it turns running, then passed THEN the same slot reads Run a#build with the play icon', () => {
      const { run } = latestOf(rig);

      toolbar.sync(RUNNING);
      toolbar.sync(PASSED);

      expect(latestOf(rig).run).toBe(run);
      expect(run.getAttribute('aria-label')).toBe('Run a#build');
      expect(run.children[0]?.className).toBe('codicon codicon-play');
    });

    it('WHEN it turns passed THEN the slot, already Run, is not written', () => {
      const setAttribute = vi.spyOn(latestOf(rig).run, 'setAttribute');

      toolbar.sync(PASSED);

      expect(setAttribute).not.toHaveBeenCalled();
    });

    it('WHEN Run has focus and the task turns running THEN the slot keeps focus', () => {
      toolbar.place(AT_BUILD, 1);
      latestOf(rig).run.focus();
      toolbar.sync(RUNNING);

      expect(document.activeElement).toBe(latestOf(rig).run);
    });

    it('WHEN Run is clicked THEN the task is run', () => {
      latestOf(rig).run.click();

      expect(rig.deps.onRun).toHaveBeenCalledExactlyOnceWith('a#build', 'run');
    });

    it('WHEN the task turns running and the slot is clicked THEN the task is stopped', () => {
      toolbar.sync(RUNNING);
      latestOf(rig).run.click();

      expect(rig.deps.onRun).toHaveBeenCalledExactlyOnceWith('a#build', 'stop');
    });

    it('WHEN Show package is clicked THEN the package a is shown', () => {
      latestOf(rig).showPackage?.click();

      expect(rig.deps.onShowPackage).toHaveBeenCalledExactlyOnceWith('a');
    });

    it('WHEN it is placed at zoom 0.49 THEN only the "…" shows, as the Tab stop', () => {
      toolbar.place(AT_BUILD, COMPACT);

      expect(shownLabelsOf(latestOf(rig))).toStrictEqual(['Actions for a#build']);
      expect(latestOf(rig).ellipsis.tabIndex).toBe(0);
    });

    it('WHEN Run has focus and it is placed at zoom 0.49 THEN the "…" has focus', () => {
      toolbar.place(AT_BUILD, 1);
      latestOf(rig).run.focus();
      toolbar.place(AT_BUILD, COMPACT);

      expect(document.activeElement).toBe(latestOf(rig).ellipsis);
    });
  });

  describe('GIVEN the toolbar of a#build, not runnable, with focus on Show package', () => {
    beforeEach((): void => {
      toolbar.sync(NOT_RUNNABLE);
      toolbar.place(AT_BUILD, 1);
      latestOf(rig).showPackage?.focus();
    });

    it('WHEN it is placed at zoom 0.49 THEN it hides and the container has focus', () => {
      toolbar.place(AT_BUILD, COMPACT);

      expect(latestOf(rig).root.hidden).toBe(true);
      expect(document.activeElement).toBe(rig.container);
    });
  });

  describe('GIVEN the toolbar of a#build, not runnable and continuous, with focus on its Stop', () => {
    it('WHEN the run ends THEN Show package has focus', () => {
      toolbar.sync(NOT_RUNNABLE_CONTINUOUS);
      toolbar.place(AT_BUILD, 1);
      latestOf(rig).run.focus();
      toolbar.sync(NOT_RUNNABLE);
      toolbar.place(AT_BUILD, 1);

      expect(document.activeElement).toBe(latestOf(rig).showPackage);
    });
  });

  describe('GIVEN the toolbar of the root task //#build', () => {
    it('WHEN its buttons are read THEN it has no Show package', () => {
      toolbar.sync(ROOT_IDLE);

      expect(latestOf(rig).showPackage).toBeNull();
    });
  });

  describe('GIVEN a toolbar synced for each case', () => {
    it.each(COUNT_CASES)('WHEN $title is counted THEN it shows $expected buttons', ({ model, zoom, expected }) => {
      toolbar.sync(model);

      const count = toolbar.countAt(zoom);

      expect(count).toBe(expected);
    });
  });

  describe('GIVEN no toolbar', () => {
    it('WHEN a#build is synced idle THEN its new slot is written once, as Run a#build', () => {
      const { taskToolbar } = rig.deps.views;
      const setAttributes: string[][] = [];
      const buildSpied = (id: string, packageName: string): TaskToolbarElements => {
        const built = taskToolbar(id, packageName);
        const { setAttribute } = built.run;

        vi.spyOn(built.run, 'setAttribute').mockImplementation((name, value): void => {
          setAttributes.push([name, value]);
          setAttribute.call(built.run, name, value);
        });

        return built;
      };

      vi.spyOn(rig.deps.views, 'taskToolbar').mockImplementation(buildSpied);
      toolbar.sync(IDLE);

      expect(setAttributes).toStrictEqual([['aria-label', 'Run a#build']]);
    });

    it('WHEN a#build is synced running THEN its new slot reads Stop a#build', () => {
      toolbar.sync(RUNNING);

      const label = latestOf(rig).run.getAttribute('aria-label');

      expect(label).toBe('Stop a#build');
    });

    it('WHEN it is placed THEN nothing happens', () => {
      const place = (): void => toolbar.place(AT_BUILD, 1);

      expect(place).not.toThrow();
    });

    it('WHEN its "…" is read THEN there is none', () => {
      const ellipsis = toolbar.ellipsis();

      expect(ellipsis).toBeNull();
    });

    it('WHEN it is counted THEN it shows no button', () => {
      const count = toolbar.countAt(1);

      expect(count).toBe(0);
    });
  });
});
