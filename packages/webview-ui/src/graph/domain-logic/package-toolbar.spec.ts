import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PackageToolbar } from './package-toolbar.ts';
import { CLEAR_FOCUS_LABEL } from '../common/details.const.ts';
import type { PackageToolbarDeps } from '../common/graph-widgets.type.ts';
import { FOCUS_PACKAGE_TITLE } from '../common/graph.const.ts';
import type { MenuTarget, PackageMenuState, PackageToolbarElements } from '../common/widget.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { widgetRowViewsMock } from '../test/mocks/widget-row-views.mock.ts';
import { pressKey } from '../test/utils/key-events.spec.util.ts';
import { rectOf } from '../test/utils/rect.spec.util.ts';

type ToolbarRig = {
  readonly toolbar: PackageToolbar;
  readonly layer: HTMLElement;
  readonly container: HTMLElement;
  readonly deps: PackageToolbarDeps;
  readonly toolbars: PackageToolbarElements[];
};

const rigOf = (): ToolbarRig => {
  const layer = document.createElement('div');
  const container = document.createElement('div');
  const { views, toolbars } = widgetRowViewsMock();
  const deps: PackageToolbarDeps = {
    layer,
    container,
    views,
    onMenu: vi.fn(),
    onFocus: vi.fn(),
    onStartTrace: vi.fn(),
    onShowTasks: vi.fn(),
    onCollapse: vi.fn()
  };
  const toolbar = new PackageToolbar(deps);
  const rig: ToolbarRig = { toolbar, layer, container, deps, toolbars };

  return rig;
};

const WITH_TASKS: PackageMenuState = { isFocus: false, hasTasks: true };
const NO_TASKS: PackageMenuState = { isFocus: false, hasTasks: false };
const FOCUSED: PackageMenuState = { isFocus: true, hasTasks: true };
const AT_WEB = rectOf(100, 50, 124, 74);

const COMPACT_ZOOM = 0.4;

/** The Tab stop of each button in DOM order: Focus, Start trace, Show tasks, "…". */
const stopsOf = (elements: PackageToolbarElements): number[] => {
  const { focus, startTrace, showTasks, ellipsis } = elements;
  const buttons = [focus, startTrace, showTasks, ellipsis];
  const stops = buttons.map((button): number => button.tabIndex);

  return stops;
};

const latestOf = (rig: ToolbarRig): PackageToolbarElements => {
  const latest = rig.toolbars.at(-1);

  if (latest === undefined) throw new Error('no toolbar was built');

  return latest;
};

describe('FEATURE: PackageToolbar', () => {
  let rig: ToolbarRig;

  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
    rig = rigOf();
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the web toolbar is synced twice', () => {
    it('WHEN the layer is read THEN it holds the one root, the same element', () => {
      rig.toolbar.sync('web', null, NO_TASKS);
      const first = rig.layer.children[0];

      rig.toolbar.sync('web', null, NO_TASKS);

      expect(rig.layer.children).toHaveLength(1);
      expect(rig.layer.children[0]).toBe(first);
    });
  });

  describe('GIVEN the web toolbar is replaced by docs, with a row already in the layer', () => {
    it('WHEN the layer is read THEN the web root is gone and the docs root comes first', () => {
      const row = document.createElement('div');

      rig.layer.append(row);
      rig.toolbar.sync('web', null, NO_TASKS);
      const web = rig.layer.children[0];

      rig.toolbar.sync('docs', null, NO_TASKS);

      expect(rig.layer.children).not.toContain(web);
      expect(rig.layer.children).toHaveLength(2);
      expect(rig.layer.children[0]?.getAttribute('aria-label')).toBe('Package docs');
      expect(rig.layer.children[1]).toBe(row);
    });
  });

  describe('GIVEN the "…" of the web toolbar has focus', () => {
    beforeEach((): void => {
      rig.toolbar.sync('web', null, NO_TASKS);
      rig.toolbar.ellipsis()?.focus();
    });

    it('WHEN the selection clears THEN the container has focus', () => {
      rig.toolbar.sync(null, null, null);

      expect(document.activeElement).toBe(rig.container);
    });

    it('WHEN the toolbar is placed nowhere THEN the container has focus', () => {
      rig.toolbar.place(null, 1);

      expect(document.activeElement).toBe(rig.container);
    });
  });

  describe('GIVEN focus is elsewhere', () => {
    it('WHEN the selection clears THEN focus stays there', () => {
      const other = document.createElement('button');

      rig.toolbar.sync('web', null, NO_TASKS);
      other.focus();
      rig.toolbar.sync(null, null, null);

      expect(document.activeElement).toBe(other);
    });
  });

  describe('GIVEN the web toolbar', () => {
    beforeEach((): void => {
      rig.toolbar.sync('web', null, NO_TASKS);
    });

    it('WHEN it is placed nowhere THEN its root is hidden', () => {
      rig.toolbar.place(AT_WEB, 1);
      rig.toolbar.place(null, 1);

      expect(rig.layer.children[0]).toHaveProperty('hidden', true);
    });

    it('WHEN it is placed at {100, 50, 124, 74} THEN its root is shown at translate(100px, 50px)', () => {
      rig.toolbar.place(AT_WEB, 1);

      expect(rig.layer.children[0]).toHaveProperty('hidden', false);
      expect(rig.layer.children[0]).toHaveProperty('style.transform', 'translate(100px, 50px)');
    });

    it('WHEN its "…" is clicked THEN the package menu opens from it', () => {
      const ellipsis = rig.toolbar.ellipsis();
      const target: MenuTarget = { kind: 'package', name: 'web' };

      ellipsis?.click();

      expect(rig.deps.onMenu).toHaveBeenCalledWith(target, ellipsis);
    });
  });

  describe('GIVEN no toolbar', () => {
    it('WHEN its name, "…" and count are read THEN they are null, null and 0', () => {
      expect(rig.toolbar.name()).toBeNull();
      expect(rig.toolbar.ellipsis()).toBeNull();
      expect(rig.toolbar.count()).toBe(0);
    });
  });

  describe('GIVEN the web toolbar in the folder apps, web not the focus', () => {
    beforeEach((): void => {
      rig.toolbar.sync('web', 'apps', WITH_TASKS);
    });

    it('WHEN web becomes the focus THEN the same root stays and Focus is pressed with the Clear focus title', () => {
      const first = rig.layer.children[0];

      rig.toolbar.sync('web', 'apps', FOCUSED);

      const { focus } = latestOf(rig);

      expect(rig.layer.children[0]).toBe(first);
      expect(focus.getAttribute('aria-pressed')).toBe('true');
      expect(focus.title).toBe(CLEAR_FOCUS_LABEL);
    });

    it('WHEN web stops being the focus THEN Focus is unpressed with its own title again', () => {
      rig.toolbar.sync('web', 'apps', FOCUSED);

      rig.toolbar.sync('web', 'apps', WITH_TASKS);

      const { focus } = latestOf(rig);

      expect(focus.getAttribute('aria-pressed')).toBe('false');
      expect(focus.title).toBe(FOCUS_PACKAGE_TITLE);
    });

    it('WHEN the folder is lost (the page goes flat) THEN a new root without Collapse takes the place', () => {
      const first = rig.layer.children[0];

      rig.toolbar.sync('web', null, WITH_TASKS);

      expect(rig.layer.children).toHaveLength(1);
      expect(rig.layer.children[0]).not.toBe(first);
      expect(latestOf(rig).collapse).toBeNull();
    });

    it('WHEN the folder changes to the root folder THEN a new root is built', () => {
      const first = rig.layer.children[0];

      rig.toolbar.sync('web', '', WITH_TASKS);

      expect(rig.layer.children[0]).not.toBe(first);
      expect(latestOf(rig).collapse?.getAttribute('aria-label')).toBe('Collapse folder (root)');
    });
  });

  describe('GIVEN the web toolbar on a flat page without tasks', () => {
    it('WHEN web gains tasks THEN the count follows the new state from 3 to 4', () => {
      rig.toolbar.sync('web', null, NO_TASKS);
      const before = rig.toolbar.count();

      rig.toolbar.sync('web', null, WITH_TASKS);

      expect([before, rig.toolbar.count()]).toStrictEqual([3, 4]);
    });
  });

  describe('GIVEN the web toolbar in the folder apps with tasks', () => {
    beforeEach((): void => {
      rig.toolbar.sync('web', 'apps', WITH_TASKS);
    });

    it('WHEN Focus is clicked THEN onFocus is called with web', () => {
      latestOf(rig).focus.click();

      expect(rig.deps.onFocus).toHaveBeenCalledWith('web');
    });

    it('WHEN Start trace is clicked THEN onStartTrace is called', () => {
      latestOf(rig).startTrace.click();

      expect(rig.deps.onStartTrace).toHaveBeenCalledTimes(1);
    });

    it('WHEN Show tasks is clicked THEN onShowTasks is called with web', () => {
      latestOf(rig).showTasks.click();

      expect(rig.deps.onShowTasks).toHaveBeenCalledWith('web');
    });

    it('WHEN Collapse is clicked THEN onCollapse is called with apps', () => {
      latestOf(rig).collapse?.click();

      expect(rig.deps.onCollapse).toHaveBeenCalledWith('apps');
    });
  });

  describe('GIVEN the web toolbar in the root folder', () => {
    it('WHEN Collapse is clicked THEN onCollapse is called with the empty folder name', () => {
      rig.toolbar.sync('web', '', WITH_TASKS);

      latestOf(rig).collapse?.click();

      expect(rig.deps.onCollapse).toHaveBeenCalledWith('');
    });
  });

  describe('GIVEN the web toolbar with tasks, placed at full zoom with Focus focused', () => {
    beforeEach((): void => {
      rig.toolbar.sync('web', null, WITH_TASKS);
      rig.toolbar.place(AT_WEB, 1);
      latestOf(rig).focus.focus();
    });

    it('WHEN Right is pressed THEN Start trace has focus and is the one Tab stop', () => {
      const { focus, startTrace } = latestOf(rig);

      const isPrevented = pressKey(latestOf(rig).root, 'ArrowRight', focus);

      expect(isPrevented).toBe(true);
      expect(document.activeElement).toBe(startTrace);
      expect(stopsOf(latestOf(rig))).toStrictEqual([-1, 0, -1, -1]);
    });

    it('WHEN Left is pressed THEN the "…" has focus, wrapping', () => {
      const { focus, ellipsis } = latestOf(rig);

      pressKey(latestOf(rig).root, 'ArrowLeft', focus);

      expect(document.activeElement).toBe(ellipsis);
    });

    it('WHEN End is pressed THEN the "…" has focus', () => {
      const { focus, ellipsis } = latestOf(rig);

      pressKey(latestOf(rig).root, 'End', focus);

      expect(document.activeElement).toBe(ellipsis);
    });

    it('WHEN Home is pressed on Start trace THEN Focus has focus', () => {
      const { focus, startTrace } = latestOf(rig);

      startTrace.focus();
      pressKey(latestOf(rig).root, 'Home', startTrace);

      expect(document.activeElement).toBe(focus);
    });

    it('WHEN a is pressed THEN focus and the Tab stop stay and the key is not prevented', () => {
      const { focus } = latestOf(rig);

      const isPrevented = pressKey(latestOf(rig).root, 'a', focus);

      expect(isPrevented).toBe(false);
      expect(document.activeElement).toBe(focus);
      expect(stopsOf(latestOf(rig))).toStrictEqual([0, -1, -1, -1]);
    });

    it('WHEN Right is pressed and the toolbar is placed again THEN the Tab stop stays on Start trace', () => {
      pressKey(latestOf(rig).root, 'ArrowRight', latestOf(rig).focus);

      rig.toolbar.place(AT_WEB, 1);

      expect(stopsOf(latestOf(rig))).toStrictEqual([-1, 0, -1, -1]);
    });

    it('WHEN Right is pressed, focus leaves the toolbar, the zoom goes compact and then full THEN the Tab stop returns to Start trace', () => {
      pressKey(latestOf(rig).root, 'ArrowRight', latestOf(rig).focus);
      rig.container.focus();

      rig.toolbar.place(AT_WEB, COMPACT_ZOOM);
      rig.toolbar.place(AT_WEB, 1);

      expect(stopsOf(latestOf(rig))).toStrictEqual([-1, 0, -1, -1]);
    });

    it('WHEN Right is pressed, the zoom goes compact and then full THEN the "…" keeps focus and is the Tab stop', () => {
      pressKey(latestOf(rig).root, 'ArrowRight', latestOf(rig).focus);

      rig.toolbar.place(AT_WEB, COMPACT_ZOOM);
      rig.toolbar.place(AT_WEB, 1);

      expect(document.activeElement).toBe(latestOf(rig).ellipsis);
      expect(stopsOf(latestOf(rig))).toStrictEqual([-1, -1, -1, 0]);
    });

    it('WHEN the "…" gains focus (a click) THEN it is the Tab stop', () => {
      latestOf(rig).ellipsis.focus();

      expect(stopsOf(latestOf(rig))).toStrictEqual([-1, -1, -1, 0]);
    });

    it('WHEN Right is pressed, web is synced again and the toolbar is placed THEN the Tab stop stays on Start trace', () => {
      pressKey(latestOf(rig).root, 'ArrowRight', latestOf(rig).focus);
      rig.toolbar.sync('web', null, FOCUSED);

      rig.toolbar.place(AT_WEB, 1);

      expect(stopsOf(latestOf(rig))).toStrictEqual([-1, 0, -1, -1]);
    });

    it('WHEN Right is pressed, web is synced again and Right is pressed again THEN the Tab stop is Show tasks once placed', () => {
      pressKey(latestOf(rig).root, 'ArrowRight', latestOf(rig).focus);
      rig.toolbar.sync('web', null, FOCUSED);
      pressKey(latestOf(rig).root, 'ArrowRight', latestOf(rig).startTrace);

      rig.toolbar.place(AT_WEB, 1);

      expect(stopsOf(latestOf(rig))).toStrictEqual([-1, -1, 0, -1]);
    });

    it('WHEN focus leaves the toolbar and the zoom goes compact THEN the "…" is the Tab stop', () => {
      rig.container.focus();

      rig.toolbar.place(AT_WEB, COMPACT_ZOOM);

      expect(stopsOf(latestOf(rig))).toStrictEqual([-1, -1, -1, 0]);
    });

    it('WHEN the toolbar is rebuilt for docs after Right THEN the Tab stop is Focus again', () => {
      pressKey(latestOf(rig).root, 'ArrowRight', latestOf(rig).focus);

      rig.toolbar.sync('docs', null, WITH_TASKS);
      rig.toolbar.place(AT_WEB, 1);

      expect(stopsOf(latestOf(rig))).toStrictEqual([0, -1, -1, -1]);
    });
  });

  describe('GIVEN the web toolbar without tasks, placed at full zoom with Start trace focused', () => {
    it('WHEN Right is pressed THEN the hidden Show tasks is skipped and the "…" has focus', () => {
      rig.toolbar.sync('web', null, NO_TASKS);
      rig.toolbar.place(AT_WEB, 1);
      const { startTrace, ellipsis } = latestOf(rig);

      startTrace.focus();
      pressKey(latestOf(rig).root, 'ArrowRight', startTrace);

      expect(document.activeElement).toBe(ellipsis);
    });
  });
});
