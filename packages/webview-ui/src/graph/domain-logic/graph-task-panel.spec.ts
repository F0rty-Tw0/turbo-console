import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { saveDetailsToggle, taskPanelOf } from './graph-task-panel.ts';
import { PACKAGE_NOTICE_MS, UNKNOWN_TASKS_TEXT } from '../common/graph-task.const.ts';
import type { TaskPanel, TaskScreenElements } from '../common/graph-task.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { taskWidgetsMock } from '../test/mocks/graph-task-mode.mock.ts';
import { droppedTasksText, tasksHiddenText } from '../utils/task-text.util.ts';

type PanelRig = {
  readonly panel: TaskPanel;
  readonly notice: HTMLElement;
  /** The toolbar status line. */
  readonly status: HTMLElement;
  readonly banner: HTMLElement;
  /** The cap banner's `role=status` line. */
  readonly bannerText: HTMLElement;
};

const line = (): HTMLElement => document.createElement('p');

const rigOf = (): PanelRig => {
  const notice = line();
  const banner = line();
  const bannerText = line();
  const taskScreen: TaskScreenElements = {
    prompt: line(),
    banner,
    bannerText,
    showAll: document.createElement('button'),
    notice
  };
  const status = line();
  const page = { root: line(), taskMode: document.createElement('button'), taskScreen, container: line(), status };
  const panel = taskPanelOf(page, { onShowAll: vi.fn() });
  const rig: PanelRig = { panel, notice, status, banner, bannerText };

  return rig;
};

/** Every value written to `element[key]` from now on; reads still see the last one. */
const writesOf = <K extends 'textContent' | 'hidden'>(element: HTMLElement, key: K): HTMLElement[K][] => {
  const writes: HTMLElement[K][] = [];
  let value = element[key];
  const get = (): HTMLElement[K] => value;
  const set = (next: HTMLElement[K]): void => {
    writes.push(next);
    value = next;
  };

  Object.defineProperty(element, key, { get, set });

  return writes;
};

describe('FEATURE: taskPanelOf notice', () => {
  let panel: TaskPanel;
  let notice: HTMLElement;
  let status: HTMLElement;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    vi.useFakeTimers();
    ({ panel, notice, status } = rigOf());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('GIVEN package mode', () => {
    beforeEach(() => {
      panel.notice(UNKNOWN_TASKS_TEXT);
    });

    it('WHEN the unknown tasks notice shows THEN it reads that text', () => {
      expect({ hidden: notice.hidden, text: notice.textContent }).toStrictEqual({ hidden: false, text: UNKNOWN_TASKS_TEXT });
    });

    it('WHEN just under the notice time passes THEN it still shows', () => {
      vi.advanceTimersByTime(PACKAGE_NOTICE_MS - 1);

      expect(notice.hidden).toBe(false);
    });

    it('WHEN the notice time passes THEN it is hidden and empty', () => {
      vi.advanceTimersByTime(PACKAGE_NOTICE_MS);

      expect({ hidden: notice.hidden, text: notice.textContent }).toStrictEqual({ hidden: true, text: '' });
    });

    it('WHEN task mode then shows its own notice THEN the earlier time leaves it showing', () => {
      panel.enter();
      panel.notice(droppedTasksText(1));
      vi.advanceTimersByTime(PACKAGE_NOTICE_MS);

      expect({ hidden: notice.hidden, text: notice.textContent }).toStrictEqual({ hidden: false, text: droppedTasksText(1) });
    });
  });

  it('GIVEN task mode WHEN a notice shows and the notice time passes THEN it still shows', () => {
    panel.enter();
    panel.notice(UNKNOWN_TASKS_TEXT);
    vi.advanceTimersByTime(PACKAGE_NOTICE_MS);

    expect(notice.hidden).toBe(false);
  });

  it('GIVEN the status line names the selected package WHEN task mode is entered THEN the status line empties', () => {
    status.textContent = 'web · 1 dependency';
    panel.enter();

    expect(status.textContent).toBe('');
  });
});

describe('FEATURE: taskPanelOf banner', () => {
  let panel: TaskPanel;
  let banner: HTMLElement;
  let bannerText: HTMLElement;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    ({ panel, banner, bannerText } = rigOf());
    panel.show({ isEmpty: false, hiddenCount: 2 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the banner shows 2 tasks hidden', () => {
    it('WHEN the same count shows again THEN its status text is not written again', () => {
      const writes = writesOf(bannerText, 'textContent');

      panel.show({ isEmpty: false, hiddenCount: 2 });

      expect({ writes, text: bannerText.textContent }).toStrictEqual({ writes: [], text: tasksHiddenText(2) });
    });

    it('WHEN the same count shows again THEN the banner is not hidden or shown again', () => {
      const writes = writesOf(banner, 'hidden');

      panel.show({ isEmpty: false, hiddenCount: 2 });

      expect({ writes, hidden: banner.hidden }).toStrictEqual({ writes: [], hidden: false });
    });

    it('WHEN a new count shows THEN its status text is written once', () => {
      const writes = writesOf(bannerText, 'textContent');

      panel.show({ isEmpty: false, hiddenCount: 3 });

      expect(writes).toStrictEqual([tasksHiddenText(3)]);
    });

    it('WHEN no task is hidden THEN the banner is hidden once', () => {
      const writes = writesOf(banner, 'hidden');

      panel.show({ isEmpty: false, hiddenCount: 0 });

      expect(writes).toStrictEqual([true]);
    });
  });
});

describe('FEATURE: saveDetailsToggle', () => {
  it.each([
    { detailsOpen: true, keeps: 1 },
    { detailsOpen: false, keeps: 0 }
  ])(
    'WHEN the task Details panel turns open $detailsOpen THEN it re-measures, saves and keeps clear $keeps times',
    ({ detailsOpen, keeps }) => {
      const view = { resize: vi.fn() };
      const modes = { savePanels: vi.fn() };
      const deps = { view, modes };
      const widgets = taskWidgetsMock();

      saveDetailsToggle(deps, widgets, detailsOpen);

      expect(deps.view.resize).toHaveBeenCalledOnce();
      expect(deps.modes.savePanels).toHaveBeenCalledExactlyOnceWith({ detailsOpen });
      expect(widgets.keepClear).toHaveBeenCalledTimes(keeps);
    }
  );
});
