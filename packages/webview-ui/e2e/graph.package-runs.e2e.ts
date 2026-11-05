import { test } from './graph-task.fixture.ts';
import { RUNNING_OUTLINE, RUNNING_RGB } from './test/common/graph-run-colours.const.ts';
import {
  UI_RUNNING_UTILS_PASSED_STUB,
  WEB_PASSED_AND_FAILED_STUB,
  WEB_RUNNING_AND_FAILED_STUB
} from './test/stubs/graph-package-runs.stub.ts';
import { THEME_DARK_STUB } from './test/stubs/graph-theme.stub.ts';
import { collapsedSavedState } from './test/utils/graph-folder-states.spec.util.ts';
import { packageRunsState } from './test/utils/graph-package-runs.spec.util.ts';
import { groupedSavedState } from './test/utils/graph-saved-state.spec.util.ts';

const D13 = { description: 'U7 spec D13', type: 'requirement' };

const STATE = packageRunsState();

/** The dark stub's `--vscode-testing-iconPassed`, `#73c991`. */
const PASSED_RGB = 'rgb(115, 201, 145)';

/** The dark stub's `--vscode-testing-iconFailed`, `#f14c4c`. */
const FAILED_OUTLINE = { width: 2, colour: 'rgb(241,76,76)' };

const FOLDER_RINGS = { drawn: RUNNING_RGB, absent: PASSED_RGB };

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
        await graphTaskRings.expectFolderRings('packages', FOLDER_RINGS);
      });

      await test.step('AND web, a package with no state in the expanded apps box, has no outline', async (): Promise<void> => {
        await graphTaskProbe.expectRunOutline('web', null);
      });
    }
  );
});
