import { test } from './graph-task.fixture.ts';
import {
  CONTINUOUS_OUTLINE,
  FAILED_OUTLINE,
  FAILED_TO_START_OUTLINE,
  PASSED_RGB,
  RUNNING_OUTLINE,
  RUNNING_RGB,
  RUN_RING,
  SELECTION_RING
} from './test/common/graph-run-colours.const.ts';
import {
  UI_RUNNING_STUB,
  UI_RUNNING_UTILS_PASSED_STUB,
  WEB_CONTINUOUS_AND_RUNNING_STUB,
  WEB_CONTINUOUS_STUB,
  WEB_FAILED_TO_START_AND_PASSED_STUB,
  WEB_PASSED_AND_FAILED_STUB,
  WEB_RUNNING_AND_FAILED_STUB,
  WEB_RUNNING_STUB
} from './test/stubs/graph-package-runs.stub.ts';
import { THEME_DARK_STUB } from './test/stubs/graph-theme.stub.ts';
import { collapsedSavedState } from './test/utils/graph-folder-states.spec.util.ts';
import { packageRunsState } from './test/utils/graph-package-runs.spec.util.ts';
import { groupedSavedState } from './test/utils/graph-saved-state.spec.util.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';

const D13 = { description: 'U7 spec D13', type: 'requirement' };

const D14 = { description: 'U7 spec D14', type: 'requirement' };

const STATE = packageRunsState();

const RUNNING_RINGS = { drawn: RUNNING_RGB, absent: PASSED_RGB };

test.describe('FEATURE: run state on packages and collapsed folders', () => {
  test(
    'GIVEN web with a running build and a failed test, the package outline follows the strongest state of its tasks',
    { annotation: D13 },
    async ({ graphHost, graphLook, graphPage, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the boards open grouped', async (): Promise<void> => {
        await graphPage.open({ savedState: groupedSavedState(STATE.hash) });
      });

      await test.step('AND the host sends the state', async (): Promise<void> => graphHost.sendState(STATE));

      await test.step('AND the dark theme is applied', async (): Promise<void> => graphLook.applyTheme(THEME_DARK_STUB));

      await test.step('AND web#build is reported running and web#test failed', async (): Promise<void> => {
        await graphTaskHost.sendRuns(WEB_RUNNING_AND_FAILED_STUB);
      });

      await test.step('THEN web has the 2 wide running outline', async (): Promise<void> => {
        await graphTaskProbe.expectRunOutline('web', RUNNING_OUTLINE);
      });

      await test.step('AND docs has none', async (): Promise<void> => graphTaskProbe.expectRunOutline('docs', null));

      await test.step('WHEN web#build passes', async (): Promise<void> => graphTaskHost.sendRuns(WEB_PASSED_AND_FAILED_STUB));

      await test.step('THEN web has the failed outline', async (): Promise<void> => {
        await graphTaskProbe.expectRunOutline('web', FAILED_OUTLINE);
      });

      await test.step('WHEN an empty runs map arrives', async (): Promise<void> => graphTaskHost.sendRuns({}));

      await test.step('THEN web has no outline', async (): Promise<void> => graphTaskProbe.expectRunOutline('web', null));
    }
  );

  test(
    'GIVEN packages collapsed and a running ui beside a passed utils, the folder ring is the running one',
    { annotation: D13 },
    async ({ graphHost, graphLook, graphPage, graphTaskHost, graphTaskProbe, graphTaskRings }): Promise<void> => {
      await test.step('WHEN the boards open with packages collapsed', async (): Promise<void> => {
        await graphPage.open({ savedState: collapsedSavedState(STATE.hash, ['packages']) });
      });

      await test.step('AND the host sends the state', async (): Promise<void> => graphHost.sendState(STATE));

      await test.step('AND the dark theme is applied', async (): Promise<void> => graphLook.applyTheme(THEME_DARK_STUB));

      await test.step('AND ui is reported running and utils passed', async (): Promise<void> => {
        await graphTaskHost.sendRuns(UI_RUNNING_UTILS_PASSED_STUB);
      });

      await test.step('THEN the packages folder is ringed running and not passed', async (): Promise<void> => {
        await graphTaskRings.expectFolderRings('packages', RUNNING_RINGS);
      });

      await test.step('AND web, a package with no state in the expanded apps box, has no outline', async (): Promise<void> => {
        await graphTaskProbe.expectRunOutline('web', null);
      });
    }
  );

  test(
    'GIVEN web#build reported while task mode shows, the task outline is unchanged and Packages then outlines web',
    { annotation: D13 },
    async ({ graphHost, graphLook, graphPage, graphTask, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the boards open in task mode with web#build chosen', async (): Promise<void> => {
        await graphPage.open({ savedState: taskSavedState(STATE.hash, { chosen: ['web#build'] }) });
      });

      await test.step('AND the host sends the state', async (): Promise<void> => graphHost.sendState(STATE));

      await test.step('AND the dark theme is applied', async (): Promise<void> => graphLook.applyTheme(THEME_DARK_STUB));

      await test.step('AND web#build is reported running', async (): Promise<void> => graphTaskHost.sendRuns(WEB_RUNNING_STUB));

      await test.step('THEN the task web#build has the 2 wide running outline', async (): Promise<void> => {
        await graphTaskProbe.expectRunOutline('web#build', RUNNING_OUTLINE);
      });

      await test.step('WHEN Packages is pressed', async (): Promise<void> => graphTask.leave());

      await test.step('THEN web has the 2 wide running outline', async (): Promise<void> => {
        await graphTaskProbe.expectRunOutline('web', RUNNING_OUTLINE);
      });
    }
  );

  test(
    'GIVEN packages collapsed and ui running, expanding and collapsing the folder keeps the marks current',
    { annotation: D13 },
    async ({ graphFolders, graphHost, graphLook, graphPage, graphTaskHost, graphTaskRings }): Promise<void> => {
      await test.step('WHEN the boards open with packages collapsed', async (): Promise<void> => {
        await graphPage.open({ savedState: collapsedSavedState(STATE.hash, ['packages']) });
      });

      await test.step('AND the host sends the state', async (): Promise<void> => graphHost.sendState(STATE));

      await test.step('AND the dark theme is applied', async (): Promise<void> => graphLook.applyTheme(THEME_DARK_STUB));

      await test.step('AND ui is reported running', async (): Promise<void> => graphTaskHost.sendRuns(UI_RUNNING_STUB));

      await test.step('THEN the packages folder is ringed running', async (): Promise<void> => {
        await graphTaskRings.expectFolderRings('packages', RUNNING_RINGS);
      });

      await test.step('WHEN the packages header expands it', async (): Promise<void> => graphFolders.toggleInList('packages', false));

      await test.step('THEN ui is drawn with the running ring and no passed one', async (): Promise<void> => {
        await graphTaskRings.expectRings('@acme/ui', RUNNING_RINGS);
      });

      await test.step('WHEN the packages header collapses it again', async (): Promise<void> => {
        await graphFolders.toggleInList('packages', true);
      });

      await test.step('THEN the packages folder is ringed running', async (): Promise<void> => {
        await graphTaskRings.expectFolderRings('packages', RUNNING_RINGS);
      });
    }
  );

  test(
    'GIVEN web#build running, switching the grouping off and on keeps the web outline',
    { annotation: D13 },
    async ({ graphGrouping, graphHost, graphLook, graphPage, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the boards open grouped', async (): Promise<void> => {
        await graphPage.open({ savedState: groupedSavedState(STATE.hash) });
      });

      await test.step('AND the host sends the state', async (): Promise<void> => graphHost.sendState(STATE));

      await test.step('AND the dark theme is applied', async (): Promise<void> => graphLook.applyTheme(THEME_DARK_STUB));

      await test.step('AND web#build is reported running', async (): Promise<void> => graphTaskHost.sendRuns(WEB_RUNNING_STUB));

      await test.step('WHEN the grouping is switched off', async (): Promise<void> => graphGrouping.setGrouped(false));

      await test.step('THEN web has the 2 wide running outline', async (): Promise<void> => {
        await graphGrouping.expectGrouped(false);
        await graphTaskProbe.expectRunOutline('web', RUNNING_OUTLINE);
      });

      await test.step('WHEN the grouping is switched on', async (): Promise<void> => graphGrouping.setGrouped(true));

      await test.step('THEN web has the 2 wide running outline again', async (): Promise<void> => {
        await graphGrouping.expectGrouped(true);
        await graphTaskProbe.expectRunOutline('web', RUNNING_OUTLINE);
      });
    }
  );

  test(
    'GIVEN web with two task states, the outline follows the precedence running, continuous, failed to start, passed',
    { annotation: D13 },
    async ({ graphHost, graphLook, graphPage, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the boards open grouped', async (): Promise<void> => {
        await graphPage.open({ savedState: groupedSavedState(STATE.hash) });
      });

      await test.step('AND the host sends the state', async (): Promise<void> => graphHost.sendState(STATE));

      await test.step('AND the dark theme is applied', async (): Promise<void> => graphLook.applyTheme(THEME_DARK_STUB));

      await test.step('AND web#build failed to start beside a passed web#test', async (): Promise<void> => {
        await graphTaskHost.sendRuns(WEB_FAILED_TO_START_AND_PASSED_STUB);
      });

      await test.step('THEN web has the failed to start outline', async (): Promise<void> => {
        await graphTaskProbe.expectRunOutline('web', FAILED_TO_START_OUTLINE);
      });

      await test.step('WHEN web#build alone is continuous', async (): Promise<void> => graphTaskHost.sendRuns(WEB_CONTINUOUS_STUB));

      await test.step('THEN web has the continuous outline', async (): Promise<void> => {
        await graphTaskProbe.expectRunOutline('web', CONTINUOUS_OUTLINE);
      });

      await test.step('WHEN web#build is continuous and web#test runs', async (): Promise<void> => {
        await graphTaskHost.sendRuns(WEB_CONTINUOUS_AND_RUNNING_STUB);
      });

      await test.step('THEN web has the running outline', async (): Promise<void> => {
        await graphTaskProbe.expectRunOutline('web', RUNNING_OUTLINE);
      });
    }
  );

  test(
    'GIVEN web#build running, selecting web draws one ring, the run ring, and clearing the runs leaves the selection ring',
    { annotation: D14 },
    async ({ graphCanvas, graphHost, graphLook, graphPage, graphTaskHost, graphTaskRings }): Promise<void> => {
      await test.step('WHEN the boards open grouped', async (): Promise<void> => {
        await graphPage.open({ savedState: groupedSavedState(STATE.hash) });
      });

      await test.step('AND the host sends the state', async (): Promise<void> => graphHost.sendState(STATE));

      await test.step('AND the dark theme is applied', async (): Promise<void> => graphLook.applyTheme(THEME_DARK_STUB));

      await test.step('AND web#build is reported running', async (): Promise<void> => graphTaskHost.sendRuns(WEB_RUNNING_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('THEN only the run ring is drawn on web', async (): Promise<void> => {
        await graphTaskRings.expectRings('web', RUN_RING);
      });

      await test.step('WHEN an empty runs map arrives', async (): Promise<void> => graphTaskHost.sendRuns({}));

      await test.step('THEN only the selection ring is drawn on web', async (): Promise<void> => {
        await graphTaskRings.expectRings('web', SELECTION_RING);
      });
    }
  );

  test(
    'GIVEN packages collapsed and ui running, selecting the folder draws one ring, the run ring',
    { annotation: D14 },
    async ({ graphFolders, graphHost, graphLook, graphPage, graphTaskHost, graphTaskRings }): Promise<void> => {
      await test.step('WHEN the boards open with packages collapsed', async (): Promise<void> => {
        await graphPage.open({ savedState: collapsedSavedState(STATE.hash, ['packages']) });
      });

      await test.step('AND the host sends the state', async (): Promise<void> => graphHost.sendState(STATE));

      await test.step('AND the dark theme is applied', async (): Promise<void> => graphLook.applyTheme(THEME_DARK_STUB));

      await test.step('AND ui is reported running', async (): Promise<void> => graphTaskHost.sendRuns(UI_RUNNING_STUB));

      await test.step('AND the packages folder is tapped', async (): Promise<void> => graphFolders.tapFolder('packages'));

      await test.step('THEN only the run ring is drawn on the folder', async (): Promise<void> => {
        await graphTaskRings.expectFolderRings('packages', RUN_RING);
      });
    }
  );
});
