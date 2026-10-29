import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PackageToolbar } from './package-toolbar.ts';
import { CLEAR_FOCUS_LABEL } from '../common/details.const.ts';
import type { PackageToolbarDeps } from '../common/graph-widgets.type.ts';
import { FOCUS_PACKAGE_TITLE } from '../common/graph.const.ts';
import type { MenuTarget, PackageMenuState, PackageToolbarElements } from '../common/widget.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { widgetRowViewsMock } from '../test/mocks/widget-row-views.mock.ts';
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
      expect(rig.toolbars.at(-1)?.collapse).toBeNull();
    });

    it('WHEN the folder changes to the root folder THEN a new root is built', () => {
      const first = rig.layer.children[0];

      rig.toolbar.sync('web', '', WITH_TASKS);

      expect(rig.layer.children[0]).not.toBe(first);
      expect(rig.toolbars.at(-1)?.collapse?.getAttribute('aria-label')).toBe('Collapse folder (root)');
    });

    it('WHEN its buttons are counted THEN Focus, Start trace, Show tasks, Collapse and the "…" make 5', () => {
      expect(rig.toolbar.count()).toBe(5);
    });
  });

  describe('GIVEN the web toolbar on a flat page without tasks', () => {
    it('WHEN its buttons are counted THEN Focus, Start trace and the "…" make 3', () => {
      rig.toolbar.sync('web', null, NO_TASKS);

      expect(rig.toolbar.count()).toBe(3);
    });
  });

  describe('GIVEN the web toolbar in the folder apps with tasks', () => {
    beforeEach((): void => {
      rig.toolbar.sync('web', 'apps', WITH_TASKS);
    });

    it('WHEN Focus is clicked THEN onFocus is called with web', () => {
      rig.toolbars[0]?.focus.click();

      expect(rig.deps.onFocus).toHaveBeenCalledWith('web');
    });

    it('WHEN Start trace is clicked THEN onStartTrace is called', () => {
      rig.toolbars[0]?.startTrace.click();

      expect(rig.deps.onStartTrace).toHaveBeenCalledTimes(1);
    });

    it('WHEN Show tasks is clicked THEN onShowTasks is called with web', () => {
      rig.toolbars[0]?.showTasks.click();

      expect(rig.deps.onShowTasks).toHaveBeenCalledWith('web');
    });

    it('WHEN Collapse is clicked THEN onCollapse is called with apps', () => {
      rig.toolbars[0]?.collapse?.click();

      expect(rig.deps.onCollapse).toHaveBeenCalledWith('apps');
    });
  });

  describe('GIVEN the web toolbar in the root folder', () => {
    it('WHEN Collapse is clicked THEN onCollapse is called with the empty folder name', () => {
      rig.toolbar.sync('web', '', WITH_TASKS);

      rig.toolbars[0]?.collapse?.click();

      expect(rig.deps.onCollapse).toHaveBeenCalledWith('');
    });
  });
});
