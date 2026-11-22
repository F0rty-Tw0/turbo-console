import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGraphController } from './graph-controller.ts';
import type { GraphPackageModulesMessage, ModulesResult } from '../../bridge/common/graph-modules.type.ts';
import type { GraphState } from '../../bridge/common/graph-state.type.ts';
import { MODULES_MODE_CLASS } from '../common/graph-module.const.ts';
import type { GraphController } from '../common/graph-page.type.ts';
import { TASK_MODE_CLASS } from '../common/graph-task.const.ts';
import { LAYOUT_FAILED_TEXT } from '../common/graph.const.ts';
import type { PackageSideDepsMock } from '../test/common/graph-package-side.type.ts';
import { packageSideDepsMock } from '../test/mocks/graph-package-side.mock.ts';
import { MODULES_FOUND_STUB } from '../test/stubs/module-scene.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { ROOT_LISTED, WEB_LISTED } from '../test/utils/graph-module-mode.spec.util.ts';
import { stubPackageSideGlobals } from '../test/utils/graph-package-side.spec.util.ts';
import { defaultExpandedOf } from '../utils/module-expand.util.ts';
import { moduleTreeOf } from '../utils/module-tree.util.ts';

const WEB_FOUND: GraphPackageModulesMessage = { type: 'packageModules', packageName: 'web', result: MODULES_FOUND_STUB };

const FAILED_RESULT: ModulesResult = { kind: 'failed' };

const WEB_FAILED: GraphPackageModulesMessage = { type: 'packageModules', packageName: 'web', result: FAILED_RESULT };

const WEB_SCAN = { type: 'scanModules', packageName: 'web' };

const HOST_ERROR: GraphState = { kind: 'error', message: 'host failed' };

const ELK_FAILED = new Error('elk failed');

const WEB_TREE = moduleTreeOf(MODULES_FOUND_STUB.files);

const DEFAULT_EXPANDED: string[] = defaultExpandedOf(WEB_TREE);

describe('FEATURE: modules bar wiring', () => {
  let mock: PackageSideDepsMock;
  let controller: GraphController;

  beforeEach(() => {
    stubPackageSideGlobals();
    mock = packageSideDepsMock();
    controller = createGraphController(mock.deps);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN a single-package root in task mode', () => {
    beforeEach(() => {
      controller.receive({ type: 'state', state: ROOT_LISTED });
    });

    it('WHEN the toolbar Show modules is read THEN it is shown', () => {
      expect(mock.page.rootModulesGroup.hidden).toBe(false);
    });

    it('WHEN the toolbar Show modules is clicked THEN scanModules for // is posted', () => {
      mock.page.rootModules.click();

      expect(mock.deps.bridge.post).toHaveBeenCalledWith({ type: 'scanModules', packageName: '//' });
    });

    it('WHEN Show modules is clicked and Back pressed THEN the page goes into modules mode and back to task mode', () => {
      const { classList } = mock.page.root;

      mock.page.rootModules.click();
      const entered = classList.contains(MODULES_MODE_CLASS);

      mock.page.modules.back.click();

      expect([entered, classList.contains(TASK_MODE_CLASS), classList.contains(MODULES_MODE_CLASS)]).toStrictEqual([true, true, false]);
    });
  });

  describe('GIVEN a multi-package graph', () => {
    it('WHEN the toolbar Show modules is read THEN it is hidden', () => {
      controller.receive({ type: 'state', state: WEB_LISTED });

      expect(mock.page.rootModulesGroup.hidden).toBe(true);
    });
  });

  describe('GIVEN a multi-package graph with web shown in modules mode', () => {
    beforeEach(() => {
      controller.receive({ type: 'state', state: WEB_LISTED });
      controller.receive({ type: 'showModules', name: 'web' });
      controller.receive(WEB_FOUND);
    });

    it('WHEN Test files is unchecked THEN the saved view hides tests and nothing is posted', () => {
      const posts = vi.mocked(mock.deps.bridge.post).mock.calls.length;

      mock.page.modules.tests.checked = false;
      mock.page.modules.tests.dispatchEvent(new Event('change'));

      expect(vi.mocked(mock.saver.schedule).mock.lastCall?.[0].modules?.shown.tests).toBe(false);
      expect(vi.mocked(mock.deps.bridge.post).mock.calls).toHaveLength(posts);
    });

    it('WHEN Test files is unchecked THEN the module graph is laid out again', () => {
      const runs = mock.runs.count();

      mock.page.modules.tests.checked = false;
      mock.page.modules.tests.dispatchEvent(new Event('change'));

      expect(mock.runs.count()).toBe(runs + 1);
    });

    it('WHEN Refresh is pressed THEN scanModules for web is posted once more', () => {
      const post = vi.mocked(mock.deps.bridge.post);
      const posts = post.mock.calls.length;

      mock.page.modules.refresh.click();

      expect([post.mock.calls.length, post.mock.lastCall]).toStrictEqual([posts + 1, [WEB_SCAN]]);
    });

    it('WHEN Retry is pressed THEN scanModules for web is posted once more', () => {
      const post = vi.mocked(mock.deps.bridge.post);
      const posts = post.mock.calls.length;

      mock.page.modules.retry.click();

      expect([post.mock.calls.length, post.mock.lastCall]).toStrictEqual([posts + 1, [WEB_SCAN]]);
    });

    it('WHEN Reset view is pressed THEN the default expansion is saved again', () => {
      const schedule = vi.mocked(mock.saver.schedule);
      const saves = schedule.mock.calls.length;

      mock.page.modules.reset.click();

      expect([schedule.mock.calls.length, schedule.mock.lastCall?.[0].modules?.expanded]).toStrictEqual([saves + 1, DEFAULT_EXPANDED]);
    });

    it('WHEN Reset view is pressed and its layout lands THEN the view fits', async () => {
      mock.page.modules.reset.click();
      await mock.runs.settle(mock.runs.count() - 1, resultOf('modules', {}));

      expect(mock.view.fit).toHaveBeenCalledOnce();
    });

    it('WHEN Back is pressed THEN modules mode is left for the package graph', () => {
      mock.page.modules.back.click();

      expect(mock.page.root.classList.contains(MODULES_MODE_CLASS)).toBe(false);
    });

    it('WHEN Packages is clicked THEN modules mode is left', () => {
      mock.page.packagesMode.click();

      expect(mock.page.root.classList.contains(MODULES_MODE_CLASS)).toBe(false);
    });
  });

  describe('GIVEN web shown in modules mode, then a host error in place of the graph', () => {
    beforeEach(async () => {
      controller.receive({ type: 'state', state: WEB_LISTED });
      controller.receive({ type: 'showModules', name: 'web' });
      controller.receive(WEB_FOUND);
      await mock.runs.settle(mock.runs.count() - 1, resultOf('modules', {}));
      controller.receive({ type: 'state', state: HOST_ERROR });
    });

    it('WHEN a graph state listing web arrives and its layout lands THEN the graph view is back with the camera kept', async () => {
      const runs = mock.runs.count();
      const fits = mock.view.fit.mock.calls.length;

      controller.receive({ type: 'state', state: WEB_LISTED });
      await mock.runs.settle(runs, resultOf('modules', {}));

      expect([mock.page.message.hidden, mock.page.toolbar.hidden, mock.page.body.hidden, mock.view.fit.mock.calls.length]).toStrictEqual([
        true,
        false,
        false,
        fits
      ]);
    });
  });

  describe('GIVEN web failed in modules mode, then a host error in place of the graph', () => {
    beforeEach(() => {
      controller.receive({ type: 'state', state: WEB_LISTED });
      controller.receive({ type: 'showModules', name: 'web' });
      controller.receive(WEB_FAILED);
      controller.receive({ type: 'state', state: HOST_ERROR });
    });

    it('WHEN a graph state listing web arrives THEN the graph view is back with the modules bar', () => {
      controller.receive({ type: 'state', state: WEB_LISTED });

      expect([mock.page.message.hidden, mock.page.body.hidden, mock.page.root.classList.contains(MODULES_MODE_CLASS)]).toStrictEqual([
        true,
        false,
        true
      ]);
    });
  });

  describe('GIVEN web in modules mode whose layout failed', () => {
    beforeEach(async () => {
      controller.receive({ type: 'state', state: WEB_LISTED });
      controller.receive({ type: 'showModules', name: 'web' });
      controller.receive(WEB_FOUND);
      await mock.runs.fail(mock.runs.count() - 1, ELK_FAILED);
    });

    it('WHEN it is read THEN the page shows Layout failed in place of the graph', () => {
      expect([mock.page.message.hidden, mock.page.messageText.textContent, mock.page.body.hidden]).toStrictEqual([
        false,
        `${LAYOUT_FAILED_TEXT}: elk failed`,
        true
      ]);
    });

    it('WHEN Refresh is pressed and the new scan lays out THEN the graph view is back', async () => {
      mock.page.modules.refresh.click();
      controller.receive(WEB_FOUND);
      await mock.runs.settle(mock.runs.count() - 1, resultOf('modules', {}));

      expect([mock.page.message.hidden, mock.page.toolbar.hidden, mock.page.body.hidden]).toStrictEqual([true, false, false]);
    });
  });
});
