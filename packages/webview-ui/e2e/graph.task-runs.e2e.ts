import type { NodeStates } from './common/graph.type.ts';
import { expect, test } from './graph-task.fixture.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { THEME_HC_STUB } from './test/stubs/graph-theme.stub.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';
import type { GraphWebviewMessage } from '../src/bridge/common/graph-message.type.ts';
import type { GraphReady, Position } from '../src/bridge/common/graph-state.type.ts';

const RUNS = { description: 'M4-5a spec 3.2 side panel, 6.4-6.5', type: 'requirement' };

const HIGHLIGHT = { description: 'M4-5a spec 3.4, 3.6', type: 'requirement' };

const KEYBOARD = { description: 'M4-5a spec 9a.6, WCAG 2.1.1', type: 'requirement' };

const RF4 = { description: 'M4-5a RF4', type: 'requirement' };

const CHAIN = ['app#build', 'lib#build', 'ui#build'];

/** `lib#build` at depth 1: the `ui#build` it needs and its dependents `app#build` and `lib#test`. */
const LIB_SET = ['app#build', 'lib#build', 'lib#test', 'ui#build'];

/** The high contrast stub's `--vscode-testing-iconFailed`, `#f48771`, as Cytoscape reports it. */
const FAILED_RGB = 'rgb(244, 135, 113)';

const RUN_APP: GraphWebviewMessage = { type: 'runTask', taskId: 'app#build', noCache: false };

const RUN_APP_NO_CACHE: GraphWebviewMessage = { type: 'runTask', taskId: 'app#build', noCache: true };

const STOP_APP: GraphWebviewMessage = { type: 'stopTask', taskId: 'app#build' };

/** `lib#test` selected with `lib#build` chosen: its dependencies light up, `app#build` and its compound dim. */
const LIB_TEST_LIT: NodeStates = {
  'app#build': 'dimmed',
  'lib#build': 'highlighted',
  'lib#test': 'selected',
  'ui#build': 'highlighted',
  'pkg:app': 'dimmed',
  'pkg:lib': 'normal',
  'pkg:ui': 'normal'
};

const LIB_SET_NORMAL: NodeStates = {
  'app#build': 'normal',
  'lib#build': 'normal',
  'lib#test': 'normal',
  'ui#build': 'normal',
  'pkg:app': 'normal',
  'pkg:lib': 'normal',
  'pkg:ui': 'normal'
};

/** The same hash as the stub without `app#build`, the selected dependent of `lib#build`. */
const NO_APP_BUILD: GraphReady = {
  ...TASK_MODE_STATE_STUB,
  tasks: TASK_MODE_STATE_STUB.tasks.filter((task) => task.id !== 'app#build')
};

test.describe('FEATURE: graph task runs and the task panel', () => {
  test.describe('GIVEN a cold open in task mode with app#build chosen', () => {
    test.beforeEach(async ({ graphHost, graphPage, graphTaskProbe }): Promise<void> => {
      await graphPage.open({ savedState: taskSavedState('7a5c0001', { chosen: ['app#build'] }) });
      await graphHost.sendState(TASK_MODE_STATE_STUB);
      await graphTaskProbe.expectTaskIds(CHAIN);
    });

    test(
      'a runs map outlines app#build in the theme failed colour, and a later empty map clears it',
      { annotation: RUNS },
      async ({ graphLook, graphTaskHost, graphTaskProbe }): Promise<void> => {
        await test.step('WHEN the high contrast theme applies and app#build failed', async (): Promise<void> => {
          await graphLook.applyTheme(THEME_HC_STUB);
          await graphTaskHost.sendRuns({ 'app#build': 'failed' });
        });

        await test.step('THEN app#build has a 3 wide outline in the failed colour', async (): Promise<void> =>
          graphTaskProbe.expectRunOutline('app#build', { width: 3, colour: FAILED_RGB }));

        await test.step('WHEN an empty runs map arrives', async (): Promise<void> => graphTaskHost.sendRuns({}));

        await test.step('THEN app#build has no outline', async (): Promise<void> =>
          graphTaskProbe.expectRunOutline('app#build', null));
      }
    );

    test(
      'the panel of app#build posts Run, Run without cache and, once running, Stop, and a dependency button selects lib#build',
      { annotation: RUNS },
      async ({ graphCanvas, graphTaskDetails, graphTaskHost }): Promise<void> => {
        await test.step('WHEN app#build is tapped', async (): Promise<void> => graphCanvas.tapNode('app#build'));

        await test.step('THEN the panel shows its name and command with no state and no Stop', async (): Promise<void> => {
          await graphTaskDetails.expectTask('build', 'build');
          await graphTaskDetails.expectState(null);
          await expect(graphTaskDetails.stop).toBeHidden();
        });

        await test.step('WHEN Run, then Run without cache are clicked', async (): Promise<void> => {
          await graphTaskDetails.run.click();
          await graphTaskDetails.runWithoutCache.click();
        });

        await test.step('THEN runTask is posted without, then with noCache', async (): Promise<void> =>
          graphTaskHost.expectTaskPosts([RUN_APP, RUN_APP_NO_CACHE]));

        await test.step('WHEN app#build is running and Stop is clicked', async (): Promise<void> => {
          await graphTaskHost.sendRuns({ 'app#build': 'running' });
          await graphTaskDetails.expectState('Running');
          await graphTaskDetails.stop.click();
        });

        await test.step('THEN stopTask is posted', async (): Promise<void> =>
          graphTaskHost.expectTaskPosts([RUN_APP, RUN_APP_NO_CACHE, STOP_APP]));

        await test.step('WHEN the lib#build dependency is clicked', async (): Promise<void> =>
          graphTaskDetails.pickDependency('lib#build'));

        await test.step('THEN lib#build is the saved selection', async (): Promise<void> =>
          graphTaskHost.expectSavedTask({ selected: 'lib#build' }));
      }
    );

    test(
      'the keyboard alone selects lib#build from the task list and runs it',
      { annotation: KEYBOARD },
      async ({ graphKeys, graphPage, graphTaskHost }): Promise<void> => {
        await test.step('WHEN Tab reaches the task list from Task mode', async (): Promise<void> => {
          await graphPage.focusButton('Task mode');
          await graphKeys.tabTo('build');
        });

        await test.step('AND ArrowDown moves to lib#build and Enter is pressed', async (): Promise<void> => {
          await graphKeys.press('ArrowDown');
          await graphKeys.press('Enter');
        });

        await test.step('THEN lib#build is the saved selection', async (): Promise<void> =>
          graphTaskHost.expectSavedTask({ selected: 'lib#build' }));

        await test.step('WHEN Tab reaches Run and Enter is pressed', async (): Promise<void> => {
          await graphKeys.tabTo('Run');
          await graphKeys.press('Enter');
        });

        await test.step('THEN runTask of lib#build is posted', async (): Promise<void> =>
          graphTaskHost.expectTaskPosts([{ type: 'runTask', taskId: 'lib#build', noCache: false }]));
      }
    );
  });

  test.describe('GIVEN a cold open in task mode with lib#build chosen', () => {
    test.beforeEach(async ({ graphHost, graphPage, graphTaskProbe }): Promise<void> => {
      await graphPage.open({ savedState: taskSavedState('7a5c0001', { chosen: ['lib#build'] }) });
      await graphHost.sendState(TASK_MODE_STATE_STUB);
      await graphTaskProbe.expectTaskIds(LIB_SET);
    });

    test(
      'tapping lib#test lights its dependencies and dims app#build and its compound, and the background clears it',
      { annotation: HIGHLIGHT },
      async ({ graphCanvas, graphProbe }): Promise<void> => {
        await test.step('WHEN lib#test is tapped', async (): Promise<void> => graphCanvas.tapNode('lib#test'));

        await test.step('THEN lib#build and ui#build are highlighted, app#build and pkg:app dimmed', async (): Promise<void> =>
          graphProbe.expectNodeStates(LIB_TEST_LIT));

        await test.step('WHEN the background is tapped', async (): Promise<void> => graphCanvas.tapBackground());

        await test.step('THEN every task and compound is normal', async (): Promise<void> =>
          graphProbe.expectNodeStates(LIB_SET_NORMAL));
      }
    );

    test(
      'a same-hash state without the selected app#build clears the saved selection and empties the panel',
      { annotation: RF4 },
      async ({ graphCanvas, graphHost, graphTaskDetails, graphTaskHost, page }): Promise<void> => {
        await test.step('WHEN app#build is tapped', async (): Promise<void> => graphCanvas.tapNode('app#build'));

        const runSpot = await test.step('AND Run is on screen', async (): Promise<Position> => graphTaskDetails.runSpot());

        await test.step('AND the same hash arrives without app#build', async (): Promise<void> => graphHost.sendState(NO_APP_BUILD));

        await test.step('THEN the saved selection is null', async (): Promise<void> =>
          graphTaskHost.expectSavedTask({ selected: null }));

        await test.step('AND the panel shows nothing', async (): Promise<void> => graphTaskDetails.expectEmpty());

        await test.step('WHEN the spot where Run was is clicked', async (): Promise<void> => page.mouse.click(runSpot.x, runSpot.y));

        await test.step('THEN nothing is posted to run', async (): Promise<void> => graphTaskHost.expectNoTaskPosts());
      }
    );
  });

  test(
    'GIVEN a package selected, then a task selected in task mode, Enter on the canvas opens no Package Details',
    { annotation: KEYBOARD },
    async ({ graphCanvas, graphHost, graphKeys, graphPage, graphProbe, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the package graph is drawn and app is tapped', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphProbe.expectNodeIds(['app', 'lib', 'ui']);
        await graphCanvas.tapNode('app');
        await graphProbe.expectSelected('app');
      });

      await test.step('AND showTasks names app#build and app#build is tapped', async (): Promise<void> => {
        await graphTaskHost.sendShowTasks(['app#build']);
        await graphTaskProbe.expectTaskIds(CHAIN);
        await graphCanvas.tapNode('app#build');
        await graphTaskHost.expectSavedTask({ selected: 'app#build' });
      });

      await test.step('AND Enter is pressed on the canvas', async (): Promise<void> => {
        await graphPage.focusContainer();
        await graphKeys.press('Enter');
      });

      await test.step('THEN no openDetails is posted', async (): Promise<void> => graphHost.expectNoOpenDetails());
    }
  );
});
