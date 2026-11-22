import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGraphController } from './graph-controller.ts';
import { GraphModuleMode } from './graph-module-mode.ts';
import type { GraphViewState, ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import { MODULES_DROPPED_WARNING, MODULES_MODE_CLASS } from '../common/graph-module.const.ts';
import type { PackageSideDepsMock } from '../test/common/graph-package-side.type.ts';
import { packageSideDepsMock } from '../test/mocks/graph-package-side.mock.ts';
import { MODULES_FOUND_STUB } from '../test/stubs/module-scene.stub.ts';
import { stubPackageSideGlobals } from '../test/utils/graph-package-side.spec.util.ts';
import { freshModulesViewOf, freshViewStateOf } from '../utils/fresh-view-state.util.ts';

/** A found result whose test index points past its files, which the page's validator rejects. */
const OUT_OF_RANGE = { ...MODULES_FOUND_STUB, tests: [99] };

const FRESH_STATE: GraphViewState = freshViewStateOf('h1');

const FRESH_WEB: ModulesViewState = freshModulesViewOf('web');

const SAVED_ON_WEB: GraphViewState = { ...FRESH_STATE, mode: 'modules', modules: FRESH_WEB };

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
  });

  describe('GIVEN a reload saved in modules mode on web', () => {
    it('WHEN the controller starts THEN modules mode is Waiting on web', () => {
      vi.mocked(mock.deps.bridge.savedState).mockReturnValue(SAVED_ON_WEB);

      const enter = vi.spyOn(GraphModuleMode.prototype, 'enter');

      createGraphController(mock.deps);

      expect(enter).toHaveBeenCalledWith('web');
    });
  });
});
