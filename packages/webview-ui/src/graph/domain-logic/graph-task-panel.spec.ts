import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { taskPanelOf } from './graph-task-panel.ts';
import { PACKAGE_NOTICE_MS, UNKNOWN_TASKS_TEXT } from '../common/graph-task.const.ts';
import type { TaskPanel, TaskScreenElements } from '../common/graph-task.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { droppedTasksText } from '../utils/task-text.util.ts';

type PanelRig = {
  readonly panel: TaskPanel;
  readonly notice: HTMLElement;
};

const line = (): HTMLElement => document.createElement('p');

const rigOf = (): PanelRig => {
  const notice = line();
  const taskScreen: TaskScreenElements = {
    prompt: line(),
    banner: line(),
    bannerText: line(),
    showAll: document.createElement('button'),
    notice
  };
  const page = { root: line(), taskMode: document.createElement('button'), taskScreen, container: line() };
  const panel = taskPanelOf(page, { onShowAll: vi.fn() });
  const rig: PanelRig = { panel, notice };

  return rig;
};

describe('FEATURE: taskPanelOf notice', () => {
  let panel: TaskPanel;
  let notice: HTMLElement;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    vi.useFakeTimers();
    ({ panel, notice } = rigOf());
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
});
