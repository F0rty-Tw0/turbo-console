import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { GraphTaskDetails } from './graph-task-details.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { WebviewMessage } from '../../bridge/common/details-message.type.ts';
import type { GraphWebviewMessage } from '../../bridge/common/graph-message.type.ts';
import { TASK_DETAILS_ID, TASK_EMPTY_LEAD_TEXT } from '../common/graph-task.const.ts';
import { DETAILS_ID } from '../common/graph.const.ts';
import type { TaskDetailsActions, TaskDetailsDeps, TaskDetailsModel, TaskDetailsView } from '../common/task-details.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { taskDetailsViewsMock } from '../test/mocks/task-details-views.mock.ts';
import { API_BUILD_STUB, GRAPH_TASK_STUB } from '../test/stubs/graph-task.stub.ts';

type Posted = WebviewMessage | GraphWebviewMessage;

type DetailsRig = {
  readonly deps: TaskDetailsDeps;
  readonly posted: Posted[];
  readonly onSelect: Mock<(id: string) => void>;
  readonly onClear: Mock<() => void>;
  readonly onToggle: Mock<(isOpen: boolean) => void>;
  readonly panel: HTMLElement;
  /** The views built so far, the latest last. */
  readonly built: TaskDetailsView[];
};

const RUNNING: TaskDetailsModel = { task: GRAPH_TASK_STUB, state: 'running', dependencies: [API_BUILD_STUB], rootLabel: null };

const PASSED: TaskDetailsModel = { ...RUNNING, state: 'passed' };

const button = (): HTMLButtonElement => document.createElement('button');

/** Every text set in `element` and below it, depth first: in the shown empty view, its heading, then its lead. */
const shownTextOf = (element: Element): string[] => {
  const children = Array.from(element.children);
  const nested = children.flatMap(shownTextOf);
  const all = [element.textContent, ...nested];

  return all.filter((text) => text !== '');
};

/** The children of the panel's content, its second child after the Details bar. */
const contentOf = (panel: HTMLElement): Element[] => Array.from(panel.children[1]?.children ?? []);

const rigOf = (): DetailsRig => {
  const posted: Posted[] = [];
  const post = (message: Posted): void => {
    posted.push(message);
  };
  const bridge: Bridge = { ready: vi.fn(), post, onMessage: vi.fn(), savedState: vi.fn(), saveState: vi.fn() };
  const page = {
    body: document.createElement('div'),
    details: button(),
    clear: button(),
    detailsBar: document.createElement('div'),
    packagesMode: button(),
    controls: button(),
    modeGroup: document.createElement('div')
  };
  const { views, panel, built } = taskDetailsViewsMock();
  const onSelect = vi.fn<(id: string) => void>();
  const onClear = vi.fn<() => void>();
  const onToggle = vi.fn<(isOpen: boolean) => void>();
  const actions: TaskDetailsActions = { onSelect, onClear };
  const deps: TaskDetailsDeps = { page, views, bridge, actions, onToggle };
  const rig: DetailsRig = { deps, posted, onSelect, onClear, onToggle, panel, built };

  return rig;
};

describe('FEATURE: GraphTaskDetails', () => {
  let rig: DetailsRig;
  let details: GraphTaskDetails;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    rig = rigOf();
    details = new GraphTaskDetails(rig.deps);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN task mode entered open with nothing selected', () => {
    beforeEach(() => {
      details.enter(true);
    });

    it('WHEN entered THEN the shown panel is mounted and the Details button points at it, expanded', () => {
      expect(rig.deps.page.body.children[0]).toBe(rig.panel);
      expect(rig.panel).toMatchObject({ id: TASK_DETAILS_ID, hidden: false });
      expect(rig.deps.page.details.getAttribute('aria-controls')).toBe(TASK_DETAILS_ID);
      expect(rig.deps.page.details.getAttribute('aria-expanded')).toBe('true');
    });

    it('WHEN entered THEN the panel shows the Details heading and the empty lead', () => {
      expect(shownTextOf(rig.panel)).toStrictEqual(['Details', TASK_EMPTY_LEAD_TEXT]);
    });

    it('WHEN entered THEN Clear selection is disabled', () => {
      expect(rig.deps.page.clear.disabled).toBe(true);
    });

    it('WHEN a task is shown THEN Clear selection is enabled and a Clear click asks to clear', () => {
      details.show(RUNNING);
      rig.deps.page.clear.click();

      expect(rig.deps.page.clear.disabled).toBe(false);
      expect(rig.deps.page.detailsBar.hidden).toBe(false);
      expect(rig.onClear).toHaveBeenCalledTimes(1);
    });

    it('WHEN Details is clicked THEN the panel hides and the closed state is passed on', () => {
      rig.deps.page.details.click();

      expect(rig.panel.hidden).toBe(true);
      expect(rig.deps.page.details.getAttribute('aria-expanded')).toBe('false');
      expect(rig.onToggle).toHaveBeenCalledWith(false);
    });

    it('WHEN task mode is left THEN the panel hides, Details points back at the package panel and Clear asks nothing', () => {
      details.exit();
      rig.deps.page.clear.click();

      expect(rig.panel.hidden).toBe(true);
      expect(rig.deps.page.details.getAttribute('aria-controls')).toBe(DETAILS_ID);
      expect(rig.onClear).not.toHaveBeenCalled();
    });

    it('WHEN task mode is left with focus in the panel THEN Packages takes focus', () => {
      details.show(RUNNING);
      rig.built[0]?.heading.focus();
      details.exit();

      expect(document.activeElement).toBe(rig.deps.page.packagesMode);
    });

    describe('AND the mode group hidden', () => {
      it('WHEN task mode is left with focus in the panel THEN Controls takes focus', () => {
        rig.deps.page.modeGroup.hidden = true;
        details.show(RUNNING);
        rig.built[0]?.heading.focus();
        details.exit();

        expect(document.activeElement).toBe(rig.deps.page.controls);
      });
    });
  });

  it('GIVEN task mode is off WHEN Details is clicked THEN nothing is passed on', () => {
    rig.deps.page.details.click();

    expect(rig.onToggle).not.toHaveBeenCalled();
  });

  describe('GIVEN a#build is shown running', () => {
    let view: TaskDetailsView | undefined;

    beforeEach(() => {
      details.enter(true);
      details.show(RUNNING);
      [view] = rig.built;
    });

    it('WHEN Run is clicked THEN runTask without noCache is posted', () => {
      view?.run.click();

      expect(rig.posted).toStrictEqual([{ type: 'runTask', taskId: 'a#build', noCache: false }]);
    });

    it('WHEN Run without cache is clicked THEN runTask with noCache is posted', () => {
      view?.runNoCache.click();

      expect(rig.posted).toStrictEqual([{ type: 'runTask', taskId: 'a#build', noCache: true }]);
    });

    it('WHEN Stop is clicked THEN stopTask is posted', () => {
      view?.stop.click();

      expect(rig.posted).toStrictEqual([{ type: 'stopTask', taskId: 'a#build' }]);
    });

    it('WHEN the api#build button is clicked THEN api#build is asked for', () => {
      view?.dependencies[0]?.button.click();

      expect(rig.onSelect).toHaveBeenCalledWith('api#build');
    });

    it('WHEN the selection is cleared THEN the panel shows the empty lead and the old Run posts nothing', () => {
      details.show(null);
      view?.run.click();

      expect(shownTextOf(rig.panel)).toStrictEqual(['Details', TASK_EMPTY_LEAD_TEXT]);
      expect(rig.posted).toStrictEqual([]);
    });

    it('WHEN task mode is left THEN Run posts nothing', () => {
      details.exit();
      view?.run.click();

      expect(rig.posted).toStrictEqual([]);
    });

    it('WHEN task mode is left THEN the api#build button asks for nothing', () => {
      details.exit();
      view?.dependencies[0]?.button.click();

      expect(rig.onSelect).not.toHaveBeenCalled();
    });

    it('WHEN the task is shown again THEN the old view posts nothing', () => {
      details.show(PASSED);
      view?.run.click();

      expect(rig.posted).toStrictEqual([]);
    });

    it('WHEN Run has focus and the task is shown again THEN the new Run takes focus', () => {
      view?.run.focus();
      details.show(PASSED);

      expect(document.activeElement).toBe(rig.built[1]?.run);
    });

    it('WHEN Run has focus and the selection is cleared THEN the empty view heading takes focus', () => {
      view?.run.focus();
      details.show(null);

      expect(document.activeElement).toMatchObject({ tagName: 'H2', textContent: 'Details' });
    });

    it('WHEN Stop has focus and the task stops running THEN the heading takes focus', () => {
      view?.stop.focus();
      details.show(PASSED);

      expect(document.activeElement?.tagName).toBe('H2');
    });
  });

  describe('GIVEN the Details bar with Clear selection first in the panel and a#build shown', () => {
    beforeEach(() => {
      rig.deps.page.detailsBar.append(rig.deps.page.clear);
      rig.panel.prepend(rig.deps.page.detailsBar);
      details.enter(true);
      details.show(RUNNING);
    });

    it('WHEN the task is shown again THEN the bar stays first and only the content holds the new view', () => {
      details.show(PASSED);

      expect([rig.panel.children.length, rig.panel.children[0]]).toStrictEqual([2, rig.deps.page.detailsBar]);
      expect(contentOf(rig.panel)).toStrictEqual([rig.built[1]?.root]);
    });

    it('WHEN the selection is cleared THEN the bar hides', () => {
      details.show(null);

      expect(rig.deps.page.detailsBar.hidden).toBe(true);
    });

    it('WHEN Clear selection has focus and the task is shown again THEN Clear keeps focus', () => {
      rig.deps.page.clear.focus();
      details.show(PASSED);

      expect(document.activeElement).toBe(rig.deps.page.clear);
    });

    it('WHEN Clear selection has focus and the selection is cleared THEN the empty view heading takes focus', () => {
      rig.deps.page.clear.focus();
      details.show(null);

      expect(document.activeElement).toMatchObject({ tagName: 'H2', textContent: 'Details' });
    });
  });
});
