import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGraphController } from './graph-controller.ts';
import type { GraphPackageModulesMessage, ModulesResult } from '../../bridge/common/graph-modules.type.ts';
import type { GraphController } from '../common/graph-page.type.ts';
import type { PackageSideDepsMock } from '../test/common/graph-package-side.type.ts';
import { packageSideDepsMock } from '../test/mocks/graph-package-side.mock.ts';
import { MODULES_FOUND_STUB } from '../test/stubs/module-scene.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { WEB_LISTED } from '../test/utils/graph-module-mode.spec.util.ts';
import { stubPackageSideGlobals } from '../test/utils/graph-package-side.spec.util.ts';

const WEB_FOUND: GraphPackageModulesMessage = { type: 'packageModules', packageName: 'web', result: MODULES_FOUND_STUB };

const FAILED_RESULT: ModulesResult = { kind: 'failed' };

const WEB_FAILED: GraphPackageModulesMessage = { type: 'packageModules', packageName: 'web', result: FAILED_RESULT };

describe('FEATURE: modules wiring after a failed scan', () => {
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

      mock.page.modules.types.checked = false;
      mock.page.modules.types.dispatchEvent(new Event('change'));

      expect(mock.runs.count()).toBe(runs + 1);
    });

    it('WHEN Type-only imports is unchecked THEN the failed banner stays', () => {
      mock.page.modules.types.checked = false;
      mock.page.modules.types.dispatchEvent(new Event('change'));

      expect([mock.page.modules.banner.hidden, mock.page.modules.retry.hidden]).toStrictEqual([false, false]);
    });
  });
});
