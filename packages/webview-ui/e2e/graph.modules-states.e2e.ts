import {
  BACK_LABEL,
  D9_IDS,
  LIMIT_FILES_TEXT,
  LIMIT_TIME_TEXT,
  REFRESH_LABEL,
  RETRY_LABEL,
  TESTS_LABEL,
  VIEWS_IDS
} from './common/graph-modules.const.ts';
import { expect, test } from './graph-modules.fixture.ts';
import { MODULES_APP_STUB, MODULES_EMPTY_STUB, MODULES_FAILED_STUB } from './test/stubs/graph-modules.stub.ts';
import { SINGLE_PACKAGE_TASKS_STUB } from './test/stubs/graph-single-package.stub.ts';
import { TASK_MODE_NEW_HASH_STUB, TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { flatModulesOf } from './test/utils/graph-modules.spec.util.ts';
import type { ModulesFound, ModulesResult } from '../src/bridge/common/graph-modules.type.ts';
import type { ModulesViewState } from '../src/bridge/common/graph-view-state.type.ts';
import { MODULE_SHOWN_CAP } from '../src/graph/common/graph-module.const.ts';

const MODULES = { description: '2026-11-22-package-modules-graph spec 7, 9', type: 'requirement' };

const REVIEW_RELOAD = { description: '2026-11-22-package-modules-graph Review Focus 2', type: 'requirement' };

const REVIEW_SINGLE = { description: '2026-11-22-package-modules-graph Review Focus 3, D12', type: 'requirement' };

const SINGLE_TASK_IDS = ['//#build', '//#lint', '//#test:unit'];

const DROPPED_TEXT = '3 items were left out to keep the graph small.';

const ENTRIES_TEXT =
  'Partial: the scan stopped at the entry limit. Files past it are not shown, and imports of them count as unresolved.';

type Banner = {
  readonly name: string;
  readonly result: ModulesResult;
  readonly text: string | null;
};

const FILES_LIMIT: ModulesFound = { ...MODULES_APP_STUB, limit: 'files' };

const TIME_LIMIT: ModulesFound = { ...MODULES_APP_STUB, limit: 'time' };

const DROPPED_ONLY: ModulesFound = { ...MODULES_APP_STUB, dropped: 3 };

const ENTRIES_DROPPED: ModulesFound = { ...MODULES_APP_STUB, limit: 'entries', dropped: 3 };

/** Each reply and the banner spec §7.4 gives it; `null`: no banner. */
const BANNERS: Banner[] = [
  { name: 'files limit', result: FILES_LIMIT, text: LIMIT_FILES_TEXT },
  { name: 'time limit', result: TIME_LIMIT, text: LIMIT_TIME_TEXT },
  { name: 'dropped only', result: DROPPED_ONLY, text: `Partial: ${DROPPED_TEXT}` },
  { name: 'entries limit and dropped', result: ENTRIES_DROPPED, text: `${ENTRIES_TEXT} ${DROPPED_TEXT}` },
  { name: 'empty', result: MODULES_EMPTY_STUB, text: 'No source files found.' },
  { name: 'clean', result: MODULES_APP_STUB, text: null }
];

const VIEWS_NO_TESTS = VIEWS_IDS.filter((id): boolean => id !== 'file:src/views/main.spec.ts');

const TESTS_HIDDEN: ModulesViewState['shown'] = { types: true, tests: false, lazies: true };

test.describe('FEATURE: package modules view states', () => {
  test(
    'GIVEN views expanded, tests hidden and the camera zoomed, a reload waits, asks once and restores all three',
    { annotation: [MODULES, REVIEW_RELOAD] },
    async ({ graphCanvas, graphHost, graphModules, graphModulesHost, shownModules }): Promise<void> => {
      await test.step('WHEN app is shown, views is expanded, Test files unchecked and the canvas zoomed in', async (): Promise<void> => {
        await shownModules();
        await graphCanvas.tapNode('dir:src/views');
        await graphModules.expectIds(VIEWS_IDS);
        await graphModules.setShown(TESTS_LABEL, false);
        await graphModules.expectIds(VIEWS_NO_TESTS);
        await graphCanvas.zoomBy(-300);
      });

      const zoomed = await graphModules.camera();

      await test.step('THEN the modules view is saved with tests hidden and that camera', async (): Promise<void> =>
        graphModulesHost.expectModulesSaved({ packageName: 'app', shown: TESTS_HIDDEN, camera: zoomed }));

      await test.step('WHEN the page reloads, the view it restores is in modules mode', async (): Promise<void> => {
        const saved = await graphHost.reopen();

        expect(saved.mode).toBe('modules');
      });

      await test.step('THEN the bar reads Scanning app…', async (): Promise<void> => graphModules.expectBarText('Scanning app…'));

      await test.step('AND the page has not asked yet, with no package state', async (): Promise<void> =>
        graphModulesHost.expectModulesAsked('app', 0));

      await test.step('WHEN the package state arrives', async (): Promise<void> => graphHost.sendState(TASK_MODE_STATE_STUB));

      await test.step('THEN the page asks for app once', async (): Promise<void> => graphModulesHost.expectModulesAsked('app', 1));

      await test.step('WHEN the host answers', async (): Promise<void> => graphModulesHost.answerModules(MODULES_APP_STUB));

      await test.step('THEN views is expanded without the test file', async (): Promise<void> =>
        graphModules.expectIds(VIEWS_NO_TESTS));

      await test.step('AND Test files is unchecked', async (): Promise<void> => graphModules.expectChecked(TESTS_LABEL, false));

      await test.step('AND the camera is the zoomed one', async (): Promise<void> => graphModules.expectCamera(zoomed));
    }
  );

  for (const { name, result, text } of BANNERS) {
    test(
      `GIVEN a ${name} reply, the banner reads its §7.4 text`,
      { annotation: MODULES },
      async ({ graphHost, graphModules, graphModulesHost, graphPage }): Promise<void> => {
        await test.step('WHEN the package graph is drawn and the host sends showModules for app', async (): Promise<void> => {
          await graphPage.open();
          await graphHost.sendState(TASK_MODE_STATE_STUB);
          await graphModulesHost.sendShowModules('app');
        });

        await test.step(`AND the host answers with a ${name} reply`, async (): Promise<void> =>
          graphModulesHost.answerModules(result));

        await test.step('THEN the bar titles app', async (): Promise<void> => graphModules.expectBarText('Modules of app'));

        await test.step('AND the banner reads its text', async (): Promise<void> => graphModules.expectBanner(text));
      }
    );
  }

  test(
    'GIVEN a failed reply, the banner names app and Retry asks again',
    { annotation: MODULES },
    async ({ graphHost, graphModules, graphModulesHost, graphPage }): Promise<void> => {
      await test.step('WHEN the package graph is drawn and the host sends showModules for app', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphModulesHost.sendShowModules('app');
      });

      await test.step('AND the scan fails', async (): Promise<void> => graphModulesHost.answerModules(MODULES_FAILED_STUB));

      await test.step('THEN the banner reads Could not scan app.', async (): Promise<void> =>
        graphModules.expectBanner('Could not scan app.'));

      await test.step('WHEN Retry is pressed', async (): Promise<void> => graphModules.pressBar(RETRY_LABEL));

      await test.step('THEN the page asks for app a second time', async (): Promise<void> =>
        graphModulesHost.expectModulesAsked('app', 2));

      await test.step('WHEN the host answers', async (): Promise<void> => graphModulesHost.answerModules(MODULES_APP_STUB, 2));

      await test.step('THEN the banner is gone and the D9 view is drawn', async (): Promise<void> => {
        await graphModules.expectBanner(null);
        await graphModules.expectIds(D9_IDS);
      });
    }
  );

  test(
    `GIVEN ${MODULE_SHOWN_CAP + 1} root files, the slow notice shows, and at ${MODULE_SHOWN_CAP} it does not`,
    { annotation: MODULES },
    async ({ graphHost, graphModules, graphModulesHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the package graph is drawn and the host sends showModules for app', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphModulesHost.sendShowModules('app');
      });

      await test.step(`AND the host answers with ${MODULE_SHOWN_CAP + 1} root files`, async (): Promise<void> =>
        graphModulesHost.answerModules(flatModulesOf(MODULE_SHOWN_CAP + 1)));

      await test.step('THEN the root box and every file are drawn', async (): Promise<void> =>
        graphProbe.expectNodeCount(MODULE_SHOWN_CAP + 2));

      await test.step('AND the slow notice shows', async (): Promise<void> => graphModules.expectSlow(true));

      await test.step('WHEN Refresh is pressed', async (): Promise<void> => graphModules.pressBar(REFRESH_LABEL));

      await test.step(`AND the host answers with ${MODULE_SHOWN_CAP} root files`, async (): Promise<void> =>
        graphModulesHost.answerModules(flatModulesOf(MODULE_SHOWN_CAP), 2));

      await test.step('THEN the root box and every file are drawn', async (): Promise<void> =>
        graphProbe.expectNodeCount(MODULE_SHOWN_CAP + 1));

      await test.step('AND the slow notice is hidden', async (): Promise<void> => graphModules.expectSlow(false));
    }
  );

  test(
    'GIVEN a new package state while Shown, the canvas keeps the modules view and Back draws the held state',
    { annotation: MODULES },
    async ({ graphCanvas, graphHost, graphModules, graphProbe, shownModules }): Promise<void> => {
      await test.step('WHEN app is shown at D9', async (): Promise<void> => shownModules());

      await test.step('AND a package state with docs arrives', async (): Promise<void> =>
        graphHost.sendState(TASK_MODE_NEW_HASH_STUB));

      await test.step('THEN the D9 view stays drawn', async (): Promise<void> => graphModules.expectIds(D9_IDS));

      await test.step('WHEN views is tapped open, a layout that queues behind any package layout', async (): Promise<void> =>
        graphCanvas.tapNode('dir:src/views'));

      await test.step('THEN the modules view is drawn with views open', async (): Promise<void> => graphModules.expectIds(VIEWS_IDS));

      await test.step('AND no package graph was laid out for the held state', async (): Promise<void> =>
        graphHost.expectPositionsOnlyFor(TASK_MODE_STATE_STUB.hash));

      await test.step('WHEN Back is pressed', async (): Promise<void> => graphModules.pressBar(BACK_LABEL));

      await test.step('THEN the held package state is drawn', async (): Promise<void> =>
        graphProbe.expectNodeIds(['app', 'docs', 'lib', 'ui']));
    }
  );

  test(
    'GIVEN a single-package repo in task mode, the task bar Show modules asks for // and Back returns to tasks',
    { annotation: [MODULES, REVIEW_SINGLE] },
    async ({ graphHost, graphModules, graphModulesHost, graphPage, graphSinglePackage, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the single-package state is drawn in task mode', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(SINGLE_PACKAGE_TASKS_STUB);
        await graphSinglePackage.expectTaskMode();
        await graphTaskProbe.expectTaskIds(SINGLE_TASK_IDS);
      });

      await test.step('AND Show modules is pressed', async (): Promise<void> => graphModules.pressShowModules());

      await test.step('THEN the page asks for // once', async (): Promise<void> => graphModulesHost.expectModulesAsked('//', 1));

      await test.step("WHEN the host answers with //'s modules", async (): Promise<void> =>
        graphModulesHost.answerModules(MODULES_APP_STUB));

      await test.step('THEN the D9 view is drawn', async (): Promise<void> => graphModules.expectIds(D9_IDS));

      await test.step('WHEN Back is pressed', async (): Promise<void> => graphModules.pressBar(BACK_LABEL));

      await test.step('THEN task mode is back on every task', async (): Promise<void> => {
        await graphSinglePackage.expectTaskMode();
        await graphTaskProbe.expectTaskIds(SINGLE_TASK_IDS);
      });
    }
  );
});
