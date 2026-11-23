import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGraphController } from './graph-controller.ts';
import type { GraphPackageModulesMessage, ModulesResult } from '../../bridge/common/graph-modules.type.ts';
import type { GraphState } from '../../bridge/common/graph-state.type.ts';
import { MODULES_MODE_CLASS, MODULE_DETAILS_EMPTY_TEXT } from '../common/graph-module.const.ts';
import type { GraphController } from '../common/graph-page.type.ts';
import type { PackageSideDepsMock } from '../test/common/graph-package-side.type.ts';
import { packageSideDepsMock } from '../test/mocks/graph-package-side.mock.ts';
import { MODULES_FOUND_STUB } from '../test/stubs/module-scene.stub.ts';
import { textOf, withClassIn } from '../test/utils/class-elements.spec.util.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { WEB_LISTED } from '../test/utils/graph-module-mode.spec.util.ts';
import { moduleControlsOf, stubPackageSideGlobals } from '../test/utils/graph-package-side.spec.util.ts';

const WEB_FOUND: GraphPackageModulesMessage = { type: 'packageModules', packageName: 'web', result: MODULES_FOUND_STUB };

const FAILED_RESULT: ModulesResult = { kind: 'failed' };

const WEB_FAILED: GraphPackageModulesMessage = { type: 'packageModules', packageName: 'web', result: FAILED_RESULT };

const WEB_SCAN = { type: 'scanModules', packageName: 'web' };

const HOST_ERROR: GraphState = { kind: 'error', message: 'host failed' };

/** The lead lines of the module Details aside: its empty hint or its scan line. */
const detailsLeadsOf = (mock: PackageSideDepsMock): (string | null)[] => {
  const leads = withClassIn(mock.page.body, 'graph-module-details', 'details-lead');

  return leads.map(textOf);
};

describe('FEATURE: modules wiring after a failed scan or a host error', () => {
  let mock: PackageSideDepsMock;
  let controller: GraphController;

  beforeEach(() => {
    stubPackageSideGlobals();
    mock = packageSideDepsMock();
    controller = createGraphController(mock.deps);
    controller.receive({ type: 'state', state: WEB_LISTED });
    controller.receive({ type: 'showModules', name: 'web' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN web entered fresh, its Details reading "Scanning web…"', () => {
    it('WHEN the scan fails THEN Details reads the empty hint', () => {
      controller.receive(WEB_FAILED);

      expect(detailsLeadsOf(mock)).toStrictEqual([MODULE_DETAILS_EMPTY_TEXT]);
    });

    it('WHEN web is found THEN Details reads the empty hint', () => {
      controller.receive(WEB_FOUND);

      expect(detailsLeadsOf(mock)).toStrictEqual([MODULE_DETAILS_EMPTY_TEXT]);
    });
  });

  describe('GIVEN web Loading, then a host error in place of the graph', () => {
    beforeEach(() => {
      controller.receive({ type: 'state', state: HOST_ERROR });
    });

    it('WHEN a graph state listing web arrives THEN scanModules for web is posted again', () => {
      const post = vi.mocked(mock.deps.bridge.post);
      const posts = post.mock.calls.length;

      controller.receive({ type: 'state', state: WEB_LISTED });

      expect([post.mock.calls.length, post.mock.lastCall]).toStrictEqual([posts + 1, [WEB_SCAN]]);
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

  describe('GIVEN web found, its first layout still running, then failed on Refresh', () => {
    it('WHEN that layout lands THEN nothing is drawn under the failed banner', async () => {
      controller.receive(WEB_FOUND);
      const run = mock.runs.count() - 1;

      mock.page.modules.refresh.click();
      controller.receive(WEB_FAILED);
      await mock.runs.settle(run, resultOf('modules', {}));

      expect(mock.view.modules.show).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN web shown, then failed on Refresh with its graph kept', () => {
    beforeEach(async () => {
      controller.receive(WEB_FOUND);
      await mock.runs.settle(mock.runs.count() - 1, resultOf('modules', {}));
      mock.page.modules.refresh.click();
      controller.receive(WEB_FAILED);
    });

    it('WHEN Type-only imports is unchecked THEN the module graph is laid out again', () => {
      const runs = mock.runs.count();

      moduleControlsOf(mock).types.checked = false;
      moduleControlsOf(mock).types.dispatchEvent(new Event('change'));

      expect(mock.runs.count()).toBe(runs + 1);
    });

    it('WHEN Type-only imports is unchecked THEN the failed banner stays', () => {
      moduleControlsOf(mock).types.checked = false;
      moduleControlsOf(mock).types.dispatchEvent(new Event('change'));

      expect([mock.page.modules.banner.hidden, mock.page.modules.retry.hidden]).toStrictEqual([false, false]);
    });
  });
});
