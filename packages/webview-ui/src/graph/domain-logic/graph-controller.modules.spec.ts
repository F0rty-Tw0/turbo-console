import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGraphController } from './graph-controller.ts';
import { GraphModuleMode } from './graph-module-mode.ts';
import type { GraphModuleSitesMessage, ModuleEnd } from '../../bridge/common/graph-module-sites.type.ts';
import type { GraphPackageModulesMessage } from '../../bridge/common/graph-modules.type.ts';
import type { GraphViewState, ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import { MODULES_DROPPED_WARNING, MODULES_MODE_CLASS, SHOW_MODULES_LABEL } from '../common/graph-module.const.ts';
import type { GraphController } from '../common/graph-page.type.ts';
import type { MenuElements, MenuItemModel } from '../common/widget-menu.type.ts';
import type { RectPx, WidgetRects, WidgetViews } from '../common/widget.type.ts';
import type { PackageSideDepsMock } from '../test/common/graph-package-side.type.ts';
import { packageSideDepsMock } from '../test/mocks/graph-package-side.mock.ts';
import { MODULE_SITES_FOUND_STUB } from '../test/stubs/graph-host-message.stub.ts';
import { FLAT_POSITIONS_STUB, STATE_STUB } from '../test/stubs/graph-layouts.stub.ts';
import { MODULES_FOUND_STUB } from '../test/stubs/module-scene.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { stubPackageSideGlobals } from '../test/utils/graph-package-side.spec.util.ts';
import { freshModulesViewOf, freshViewStateOf } from '../utils/fresh-view-state.util.ts';

/** A found result whose test index points past its files, which the page's validator rejects. */
const OUT_OF_RANGE = { ...MODULES_FOUND_STUB, tests: [99] };

const FRESH_STATE: GraphViewState = freshViewStateOf('h1');

const FRESH_WEB: ModulesViewState = freshModulesViewOf('web');

const SAVED_ON_WEB: GraphViewState = { ...FRESH_STATE, mode: 'modules', modules: FRESH_WEB };

const WEB_FOUND: GraphPackageModulesMessage = { type: 'packageModules', packageName: 'web', result: MODULES_FOUND_STUB };

const FROM_A: ModuleEnd = { kind: 'file', path: 'src/a.ts' };

const WEB_SITES: GraphModuleSitesMessage = {
  type: 'moduleSites',
  packageName: 'web',
  from: FROM_A,
  to: null,
  result: MODULE_SITES_FOUND_STUB
};

/** The selected package's drawn rect, so a menu opened without a shown "…" has somewhere to anchor. */
const WEB_RECT: RectPx = { x1: 0, y1: 0, x2: 100, y2: 32 };

const WEB_RECTS: WidgetRects = { boxes: new Map(), collapsed: new Map(), selected: WEB_RECT, zoom: 1 };

const SHIFT_F10 = Object.assign(new Event('keydown'), { key: 'F10', shiftKey: true });

describe('FEATURE: createGraphController modules messages', () => {
  let mock: PackageSideDepsMock;

  beforeEach(() => {
    stubPackageSideGlobals();
    mock = packageSideDepsMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('GIVEN a page with no state yet', () => {
    it('WHEN showModules web arrives THEN modules mode enters web', () => {
      const enter = vi.spyOn(GraphModuleMode.prototype, 'enter');
      const controller = createGraphController(mock.deps);

      controller.receive({ type: 'showModules', name: 'web' });

      expect(enter).toHaveBeenCalledWith('web');
    });

    it('WHEN showModules web arrives THEN the page root carries the modules class and both mode buttons are not pressed', () => {
      const controller = createGraphController(mock.deps);

      controller.receive({ type: 'showModules', name: 'web' });
      const pressed = [mock.page.packagesMode.getAttribute('aria-pressed'), mock.page.taskMode.getAttribute('aria-pressed')];

      expect(mock.page.root.classList.contains(MODULES_MODE_CLASS)).toBe(true);
      expect(pressed).toStrictEqual(['false', 'false']);
    });

    it('WHEN modules mode is on and Packages is clicked THEN it leaves and the modules class is gone', () => {
      const controller = createGraphController(mock.deps);

      controller.receive({ type: 'showModules', name: 'web' });
      mock.page.packagesMode.click();

      expect(mock.page.root.classList.contains(MODULES_MODE_CLASS)).toBe(false);
      expect(mock.page.packagesMode.getAttribute('aria-pressed')).toBe('true');
    });

    it('WHEN modules mode is on and showPackage arrives THEN modules mode is left first', () => {
      const leave = vi.spyOn(GraphModuleMode.prototype, 'leave');
      const controller = createGraphController(mock.deps);

      controller.receive({ type: 'showModules', name: 'web' });
      controller.receive({ type: 'showPackage', name: 'web' });

      expect([leave.mock.calls.length, mock.page.root.classList.contains(MODULES_MODE_CLASS)]).toStrictEqual([1, false]);
    });

    it('WHEN a packageModules with an index out of range arrives THEN it is dropped with a console warning', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const scanned = vi.spyOn(GraphModuleMode.prototype, 'scanned');
      const controller = createGraphController(mock.deps);

      controller.receive({ type: 'packageModules', packageName: 'web', result: OUT_OF_RANGE });

      expect([scanned.mock.calls, warn.mock.calls]).toStrictEqual([[], [[MODULES_DROPPED_WARNING]]]);
    });

    it('WHEN some other invalid message arrives THEN nothing is warned', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const controller = createGraphController(mock.deps);

      controller.receive({ type: 'showModules' });

      expect(warn).not.toHaveBeenCalled();
    });

    it('WHEN a valid moduleSites answer arrives THEN the modules mode does not receive it', () => {
      const received = vi.spyOn(GraphModuleMode.prototype, 'receive');
      const controller = createGraphController(mock.deps);

      controller.receive(WEB_SITES);

      expect(received).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN modules mode scanning web, listed in a graph state', () => {
    let controller: GraphController;

    beforeEach(() => {
      controller = createGraphController(mock.deps);
      controller.receive({ type: 'showModules', name: 'web' });
      controller.receive({ type: 'state', state: STATE_STUB });
    });

    it('WHEN web is found and its run lands THEN the modules canvas shows it', async () => {
      controller.receive(WEB_FOUND);
      await mock.runs.settle(mock.runs.count() - 1, resultOf('modules', {}));

      expect(mock.view.modules.show).toHaveBeenCalledOnce();
    });

    it('WHEN web is found and Re-layout is clicked THEN the module graph is laid out again', () => {
      controller.receive(WEB_FOUND);
      const before = mock.runs.count();

      mock.page.relayout.click();

      expect(mock.runs.count()).toBe(before + 1);
    });

    it('WHEN Packages is clicked THEN the modules canvas is cleared', () => {
      const clear = vi.mocked(mock.view.modules.clear);

      clear.mockClear();
      mock.page.packagesMode.click();

      expect(clear).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN web inspected in a multi-package graph', () => {
    let controller: GraphController;

    beforeEach(async () => {
      controller = createGraphController(mock.deps);
      controller.receive({ type: 'state', state: STATE_STUB });
      await mock.runs.settle(mock.runs.count() - 1, resultOf('h1', FLAT_POSITIONS_STUB));
      vi.mocked(mock.deps.createView).mock.calls[0]?.[1].onTapNode('web');
    });

    it('WHEN the Details Show modules is clicked THEN scanModules for web is posted', () => {
      mock.packageViews.at(-1)?.showModules.click();

      expect(mock.deps.bridge.post).toHaveBeenLastCalledWith({ type: 'scanModules', packageName: 'web' });
    });
  });

  describe('GIVEN web inspected and drawn, its "…" menu opened with Shift+F10', () => {
    let menus: MenuElements[];

    beforeEach(async () => {
      menus = [];
      const build = mock.deps.widgetViews.menu;
      const record = (model: MenuItemModel[], label: string): MenuElements => {
        const built = build(model, label);

        menus.push(built);

        return built;
      };
      const widgetViews: WidgetViews = { ...mock.deps.widgetViews, menu: record };
      const controller = createGraphController({ ...mock.deps, widgetViews });

      mock.view.widgetRects.mockReturnValue(WEB_RECTS);
      controller.receive({ type: 'state', state: STATE_STUB });
      await mock.runs.settle(mock.runs.count() - 1, resultOf('h1', FLAT_POSITIONS_STUB));
      vi.mocked(mock.deps.createView).mock.calls[0]?.[1].onTapNode('web');
      mock.page.container.dispatchEvent(SHIFT_F10);
    });

    it('WHEN Show modules is chosen THEN scanModules for web is posted', () => {
      const item = menus.at(-1)?.items.find((each) => each.title === SHOW_MODULES_LABEL);

      item?.click();

      expect(mock.deps.bridge.post).toHaveBeenLastCalledWith({ type: 'scanModules', packageName: 'web' });
    });
  });

  describe('GIVEN a reload saved in modules mode on web', () => {
    it('WHEN the controller starts THEN modules mode is Waiting on web', () => {
      vi.mocked(mock.deps.bridge.savedState).mockReturnValue(SAVED_ON_WEB);

      const enter = vi.spyOn(GraphModuleMode.prototype, 'enter');

      createGraphController(mock.deps);

      expect(enter).toHaveBeenCalledWith('web');
      expect(mock.deps.bridge.post).not.toHaveBeenCalledWith({ type: 'scanModules', packageName: 'web' });
    });
  });
});
