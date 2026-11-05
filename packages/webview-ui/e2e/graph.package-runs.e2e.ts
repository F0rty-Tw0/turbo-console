import { test } from './graph-task.fixture.ts';
import { THEME_DARK_STUB } from './test/stubs/graph-theme.stub.ts';
import { collapsedSavedState } from './test/utils/graph-folder-states.spec.util.ts';
import {
  UI_RUNNING_UTILS_PASSED,
  WEB_PASSED_AND_FAILED,
  WEB_RUNNING_AND_FAILED,
  packageRunsState
} from './test/utils/graph-package-runs.spec.util.ts';
import { groupedSavedState } from './test/utils/graph-saved-state.spec.util.ts';

const D13 = { description: 'U7 spec D13', type: 'requirement' };

const STATE = packageRunsState();

/** The dark stub's `--vscode-charts-yellow`, `#cca700`, as the page draws it. */
const RUNNING_RGB = 'rgb(204, 167, 0)';

/** The dark stub's `--vscode-testing-iconPassed`, `#73c991`. */
const PASSED_RGB = 'rgb(115, 201, 145)';

const RUNNING_OUTLINE = { width: 2, colour: 'rgb(204,167,0)' };

/** The dark stub's `--vscode-testing-iconFailed`, `#f14c4c`. */
const FAILED_OUTLINE = { width: 2, colour: 'rgb(241,76,76)' };

const FOLDER_RINGS = { drawn: RUNNING_RGB, absent: PASSED_RGB };

test.describe('FEATURE: run state on packages and collapsed folders', () => {
  test(
    'GIVEN web with a running build and a failed test, the package outline follows the strongest state of its tasks',
    { annotation: D13 },
    async ({ graphHost, graphLook, graphPage, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the boards open grouped in the dark theme', async (): Promise<void> => {
        await graphPage.open({ savedState: groupedSavedState(STATE.hash) });
        await graphHost.sendState(STATE);
        await graphLook.applyTheme(THEME_DARK_STUB);
      });

      await test.step('AND web#build is reported running and web#test failed', async (): Promise<void> =>
        graphTaskHost.sendRuns(WEB_RUNNING_AND_FAILED));

      await test.step('THEN web has the 2 wide running outline and docs has none', async (): Promise<void> => {
        await graphTaskProbe.expectRunOutline('web', RUNNING_OUTLINE);
        await graphTaskProbe.expectRunOutline('docs', null);
      });

      await test.step('WHEN web#build passes', async (): Promise<void> => graphTaskHost.sendRuns(WEB_PASSED_AND_FAILED));

      await test.step('THEN web has the failed outline', async (): Promise<void> =>
        graphTaskProbe.expectRunOutline('web', FAILED_OUTLINE));

      await test.step('WHEN an empty runs map arrives', async (): Promise<void> => graphTaskHost.sendRuns({}));

      await test.step('THEN web has no outline', async (): Promise<void> => graphTaskProbe.expectRunOutline('web', null));
    }
  );

  test(
    'GIVEN packages collapsed and a running ui beside a passed utils, the folder ring is the running one',
    { annotation: D13 },
    async ({ graphHost, graphLook, graphPage, graphTaskHost, graphTaskProbe, graphTaskRings }): Promise<void> => {
      await test.step('WHEN the boards open with packages collapsed in the dark theme', async (): Promise<void> => {
        await graphPage.open({ savedState: collapsedSavedState(STATE.hash, ['packages']) });
        await graphHost.sendState(STATE);
        await graphLook.applyTheme(THEME_DARK_STUB);
      });

      await test.step('AND ui is reported running and utils passed', async (): Promise<void> =>
        graphTaskHost.sendRuns(UI_RUNNING_UTILS_PASSED));

      await test.step('THEN the packages folder is ringed running and not passed', async (): Promise<void> =>
        graphTaskRings.expectFolderRings('packages', FOLDER_RINGS));

      await test.step('AND web, a package with no state in the expanded apps box, has no outline', async (): Promise<void> =>
        graphTaskProbe.expectRunOutline('web', null));
    }
  );
});
