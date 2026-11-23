import { MODULES_FIRST_FRAME_MS } from './common/graph-tripwire.const.ts';
import { test } from './graph-modules.fixture.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { modulesAtCapOf, modulesSavedState } from './test/utils/graph-modules.spec.util.ts';
import { MODULE_SHOWN_CAP } from '../src/graph/common/graph-module.const.ts';

const AC5 = { description: '2026-11-22-package-modules-graph AC5', type: 'requirement' };

// Tracing snapshots the DOM on the page's main thread, and that CPU lands inside the measured frame.
test.use({ trace: 'off' });

test.describe('FEATURE: package modules tripwires', () => {
  // Opening straight into modules mode holds the package state (spec §7.1), so the only armed frame is the module draw.
  test(
    `GIVEN a 5000-file payload drawn at ${MODULE_SHOWN_CAP} leaves, the first frame lands under ${MODULES_FIRST_FRAME_MS} ms`,
    { annotation: AC5 },
    async ({ graphHost, graphLook, graphModules, graphModulesHost, graphModulesTiming, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page reopens in modules mode for app', async (): Promise<void> =>
        graphPage.open({ savedState: modulesSavedState('app') }));

      await test.step('AND the package state arrives', async (): Promise<void> => graphHost.sendState(TASK_MODE_STATE_STUB));

      await test.step('THEN the page asked for app once', async (): Promise<void> => graphModulesHost.expectModulesAsked('app', 1));

      await test.step('WHEN the 5000-file payload is answered', async (): Promise<void> => {
        await graphModulesTiming.markAnswer();
        await graphModulesHost.answerModules(modulesAtCapOf());
      });

      await test.step('THEN 301 nodes are drawn (root box, 250 folders, 50 stubs) with no slow notice', async (): Promise<void> => {
        await graphProbe.expectNodeCount(301);
        await graphModules.expectSlow(false);
      });

      await test.step('AND the measured frame started no earlier than the reply', async (): Promise<void> =>
        graphModulesTiming.expectFrameFromAnswer());

      await test.step(`AND the first frame came in under ${MODULES_FIRST_FRAME_MS} ms`, async (): Promise<void> =>
        graphLook.expectFirstFrameUnder(MODULES_FIRST_FRAME_MS));
    }
  );
});
