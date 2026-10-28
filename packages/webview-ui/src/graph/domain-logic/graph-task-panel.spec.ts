import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mocked } from 'vitest';

import { saveDetailsToggle, taskPanelOf } from './graph-task-panel.ts';
import { NOTICE_TEXT_DELAY_MS, PACKAGE_NOTICE_MS, UNKNOWN_TASKS_TEXT } from '../common/graph-task.const.ts';
import type { TaskPanel, TaskPanelActions, TaskPanelAsides, TaskScreenElements } from '../common/graph-task.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { taskWidgetsMock } from '../test/mocks/graph-task-mode.mock.ts';
import { droppedTasksText, showEveryTextOf, tasksHiddenText } from '../utils/task-text.util.ts';

type PanelRig = {
  readonly panel: TaskPanel;
  readonly notice: HTMLElement;
  /** The toolbar status line. */
  readonly status: HTMLElement;
  readonly banner: HTMLElement;
  /** The cap banner's `role=status` line. */
  readonly bannerText: HTMLElement;
  readonly packagesMode: HTMLButtonElement;
  readonly taskMode: HTMLButtonElement;
  readonly detailsBar: HTMLDivElement;
  readonly detailsSummary: HTMLElement;
  readonly taskAside: HTMLElement;
  readonly showEvery: HTMLButtonElement;
  /** The prompt's over-cap line. */
  readonly slow: HTMLElement;
  readonly container: HTMLElement;
  readonly actions: Mocked<TaskPanelActions>;
};

const line = (): HTMLElement => document.createElement('p');

/** The panel over a fresh page; `packageAside` is what the package Details aside lookup answers, none by default. */
const rigOf = (packageAside: HTMLElement | null = null): PanelRig => {
  const notice = line();

  notice.hidden = true;

  const banner = line();
  const bannerText = line();
  const showEvery = document.createElement('button');
  const slow = line();
  const taskScreen: TaskScreenElements = {
    prompt: line(),
    showEvery,
    slow,
    banner,
    bannerText,
    showAll: document.createElement('button'),
    notice
  };
  const status = line();
  const packagesMode = document.createElement('button');
  const taskMode = document.createElement('button');
  const detailsBar = document.createElement('div');
  const detailsSummary = line();
  const taskAside = document.createElement('aside');
  const container = line();
  const page = { root: line(), packagesMode, taskMode, taskScreen, container, status, detailsBar, detailsSummary };
  const asides: TaskPanelAsides = { package: (): HTMLElement | null => packageAside, task: taskAside };
  const actions: Mocked<TaskPanelActions> = { onShowAll: vi.fn(), onShowEvery: vi.fn(), onShown: vi.fn() };
  const panel = taskPanelOf(page, actions, asides);
  const parts = { showEvery, slow, container, actions };
  const rig: PanelRig = {
    panel,
    notice,
    status,
    banner,
    bannerText,
    packagesMode,
    taskMode,
    detailsBar,
    detailsSummary,
    taskAside,
    ...parts
  };

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

    it('WHEN the unknown tasks notice shows THEN it is shown without text yet', () => {
      expect({ hidden: notice.hidden, text: notice.textContent }).toStrictEqual({ hidden: false, text: '' });
    });

    it('WHEN just under the text delay passes THEN it still has no text', () => {
      vi.advanceTimersByTime(NOTICE_TEXT_DELAY_MS - 1);

      expect(notice.textContent).toBe('');
    });

    it('WHEN the text delay passes THEN it reads that text', () => {
      vi.advanceTimersByTime(NOTICE_TEXT_DELAY_MS);

      expect({ hidden: notice.hidden, text: notice.textContent }).toStrictEqual({ hidden: false, text: UNKNOWN_TASKS_TEXT });
    });

    it('WHEN it is hidden before the text delay passes THEN no text is written later', () => {
      panel.notice(null);
      vi.advanceTimersByTime(NOTICE_TEXT_DELAY_MS);

      expect({ hidden: notice.hidden, text: notice.textContent }).toStrictEqual({ hidden: true, text: '' });
    });

    it('WHEN a newer notice shows before the text delay passes THEN it reads the newer text at once and the older never lands', () => {
      panel.notice(droppedTasksText(1));
      const textAtOnce = notice.textContent;

      vi.advanceTimersByTime(NOTICE_TEXT_DELAY_MS);

      expect({ textAtOnce, text: notice.textContent }).toStrictEqual({ textAtOnce: droppedTasksText(1), text: droppedTasksText(1) });
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

/** The `aria-pressed` of Packages, then Tasks. */
const pressedOf = (rig: PanelRig): (string | null)[] => {
  const buttons = [rig.packagesMode, rig.taskMode];
  const pressed = buttons.map((button): string | null => button.getAttribute('aria-pressed'));

  return pressed;
};

describe('FEATURE: taskPanelOf mode buttons', () => {
  let rig: PanelRig;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    rig = rigOf();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GIVEN package mode WHEN task mode is entered THEN Tasks is pressed and Packages is not', () => {
    rig.panel.enter();

    expect(pressedOf(rig)).toStrictEqual(['false', 'true']);
  });

  it('GIVEN task mode WHEN it is exited THEN Packages is pressed and Tasks is not', () => {
    rig.panel.enter();
    rig.panel.exit();

    expect(pressedOf(rig)).toStrictEqual(['true', 'false']);
  });
});

describe('FEATURE: taskPanelOf Details bar', () => {
  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN package mode with the summary naming web', () => {
    let rig: PanelRig;

    beforeEach(() => {
      rig = rigOf();
      rig.detailsSummary.textContent = 'web · 1 dependency';
    });

    it('WHEN task mode is entered THEN the bar is the first child of the task aside', () => {
      rig.panel.enter();

      expect(rig.taskAside.children[0]).toBe(rig.detailsBar);
    });

    it('WHEN task mode is entered THEN the summary empties', () => {
      rig.panel.enter();

      expect(rig.detailsSummary.textContent).toBe('');
    });
  });

  it('GIVEN task mode and a package aside WHEN task mode is left THEN the bar is the first child of the package aside', () => {
    const packageAside = document.createElement('aside');
    const rig = rigOf(packageAside);

    packageAside.append(document.createElement('div'));
    rig.panel.enter();
    rig.panel.exit();

    expect(packageAside.children[0]).toBe(rig.detailsBar);
  });

  it('GIVEN task mode and no package aside yet WHEN task mode is left THEN the bar stays in the task aside', () => {
    const rig = rigOf();

    rig.panel.enter();
    rig.panel.exit();

    expect(rig.taskAside.children[0]).toBe(rig.detailsBar);
  });
});

describe('FEATURE: taskPanelOf banner', () => {
  let panel: TaskPanel;
  let banner: HTMLElement;
  let bannerText: HTMLElement;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    ({ panel, banner, bannerText } = rigOf());
    panel.show({ isEmpty: false, hiddenCount: 2, knownCount: 4 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the banner shows 2 tasks hidden', () => {
    it('WHEN the same count shows again THEN its status text is not written again', () => {
      const writes = writesOf(bannerText, 'textContent');

      panel.show({ isEmpty: false, hiddenCount: 2, knownCount: 4 });

      expect({ writes, text: bannerText.textContent }).toStrictEqual({ writes: [], text: tasksHiddenText(2) });
    });

    it('WHEN the same count shows again THEN the banner is not hidden or shown again', () => {
      const writes = writesOf(banner, 'hidden');

      panel.show({ isEmpty: false, hiddenCount: 2, knownCount: 4 });

      expect({ writes, hidden: banner.hidden }).toStrictEqual({ writes: [], hidden: false });
    });

    it('WHEN a new count shows THEN its status text is written once', () => {
      const writes = writesOf(bannerText, 'textContent');

      panel.show({ isEmpty: false, hiddenCount: 3, knownCount: 4 });

      expect(writes).toStrictEqual([tasksHiddenText(3)]);
    });

    it('WHEN no task is hidden THEN the banner is hidden once', () => {
      const writes = writesOf(banner, 'hidden');

      panel.show({ isEmpty: false, hiddenCount: 0, knownCount: 4 });

      expect(writes).toStrictEqual([true]);
    });
  });
});

describe('FEATURE: taskPanelOf prompt', () => {
  let rig: PanelRig;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    rig = rigOf();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    { knownCount: 0, isEveryHidden: true, isSlowHidden: true },
    { knownCount: 4, isEveryHidden: false, isSlowHidden: true },
    { knownCount: 300, isEveryHidden: false, isSlowHidden: true },
    { knownCount: 301, isEveryHidden: false, isSlowHidden: false }
  ])(
    'GIVEN $knownCount known tasks WHEN the prompt shows THEN Show every task hidden is $isEveryHidden and the slow line hidden is $isSlowHidden',
    ({ knownCount, isEveryHidden, isSlowHidden }) => {
      rig.panel.show({ isEmpty: true, hiddenCount: 0, knownCount });

      expect([rig.showEvery.hidden, rig.slow.hidden]).toStrictEqual([isEveryHidden, isSlowHidden]);
    }
  );

  it('GIVEN 4 known tasks WHEN the prompt shows THEN Show every task reads and is titled with the count', () => {
    rig.panel.show({ isEmpty: true, hiddenCount: 0, knownCount: 4 });

    expect([rig.showEvery.textContent, rig.showEvery.title]).toStrictEqual([showEveryTextOf(4), showEveryTextOf(4)]);
  });

  it('GIVEN the prompt WHEN Show every task is clicked THEN onShowEvery gets the click time and the canvas takes focus', () => {
    const click = new Event('click');

    rig.showEvery.dispatchEvent(click);

    expect(rig.actions.onShowEvery).toHaveBeenCalledExactlyOnceWith(click.timeStamp);
    expect(document.activeElement).toBe(rig.container);
  });

  it('GIVEN a new shown set WHEN the panel shows it THEN onShown fires once, after the prompt is written', () => {
    rig.actions.onShown.mockImplementation((): void => {
      expect(rig.showEvery.textContent).toBe(showEveryTextOf(4));
    });

    rig.panel.show({ isEmpty: true, hiddenCount: 0, knownCount: 4 });

    expect(rig.actions.onShown).toHaveBeenCalledOnce();
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
