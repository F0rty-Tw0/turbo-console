import { IS_SHIFT_F10_SILENT, SHIFT_F10_SILENT_REASON } from './common/graph.const.ts';
import { test } from './graph-toolbar.fixture.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { TASK_ROOT_STATE_STUB } from './test/stubs/graph-task-root.stub.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';
import type { GraphWebviewMessage } from '../src/bridge/common/graph-message.type.ts';

const D6 = { description: 'U4 D6', type: 'requirement' };

const D9 = { description: 'U4 D9', type: 'requirement' };

const CHAIN = ['app#build', 'lib#build', 'ui#build'];

const FULL_BUTTONS = ['Run app#build', 'Show package app', 'Actions for app#build'];

const RUN_APP: GraphWebviewMessage = { type: 'runTask', taskId: 'app#build', noCache: false };

const STOP_APP: GraphWebviewMessage = { type: 'stopTask', taskId: 'app#build' };

test.describe("FEATURE: the selected task's node toolbar", () => {
  test.beforeEach(async ({ graphHost, graphPage, graphTaskProbe }): Promise<void> => {
    await test.step('GIVEN a cold open in task mode with app#build chosen', async (): Promise<void> => {
      await graphPage.open({ savedState: taskSavedState('7a5c0001', { chosen: ['app#build'] }) });
      await graphHost.sendState(TASK_MODE_STATE_STUB);
      await graphTaskProbe.expectTaskIds(CHAIN);
    });
  });

  test(
    'GIVEN app#build tapped, its toolbar sits above it with Run, Show package and the "…", and opens the task menu from the "…"',
    { annotation: D6 },
    async ({ graphCanvas, graphMenus, graphTask, graphTaskToolbar }): Promise<void> => {
      await test.step('WHEN app#build is tapped', async (): Promise<void> => graphCanvas.tapNode('app#build'));

      await test.step('THEN its toolbar is above app#build', async (): Promise<void> =>
        graphTaskToolbar.expectNodeToolbarOn('app#build', 'above'));

      await test.step('AND it holds Run, Show package and the "…"', async (): Promise<void> =>
        graphTaskToolbar.expectToolbarButtons('app#build', FULL_BUTTONS));

      await test.step('WHEN the "…" is pressed', async (): Promise<void> => graphTask.menu('app#build'));

      await test.step('THEN the menu offers Run and Run without cache', async (): Promise<void> =>
        graphMenus.expectItems(['Run', 'Run without cache']));

      await test.step('AND it opened on the "…"', async (): Promise<void> => graphTaskToolbar.expectMenuOnEllipsis('app#build'));
    }
  );

  test(
    'GIVEN app#build tapped, tapping lib#build moves the one toolbar there',
    { annotation: D6 },
    async ({ graphCanvas, graphTaskToolbar }): Promise<void> => {
      await test.step('WHEN app#build is tapped', async (): Promise<void> => graphCanvas.tapNode('app#build'));

      await test.step('AND lib#build is tapped', async (): Promise<void> => graphCanvas.tapNode('lib#build'));

      await test.step('THEN the one task toolbar sits above lib#build', async (): Promise<void> =>
        graphTaskToolbar.expectNodeToolbarOn('lib#build', 'above'));
    }
  );

  test(
    'GIVEN app#build tapped and the toolbar entered by Tab, Enter on Run posts the run and the slot becomes Stop with focus kept',
    { annotation: D6 },
    async ({ graphCanvas, graphKeys, graphTaskHost, graphTaskToolbar, graphWidgets }): Promise<void> => {
      await test.step('WHEN app#build is tapped and the container is focused', async (): Promise<void> => {
        await graphCanvas.tapNode('app#build');
        await graphTaskToolbar.expectNodeInView('app#build');
        await graphWidgets.focusContainer();
      });

      await test.step('AND Tab and Enter are pressed', async (): Promise<void> => {
        await graphKeys.press('Tab');
        await graphTaskToolbar.expectButtonFocused('app#build', 'Run app#build');
        await graphKeys.press('Enter');
      });

      await test.step('THEN the page posted the run', async (): Promise<void> => graphTaskHost.expectTaskPosts([RUN_APP]));

      await test.step('WHEN the host reports app#build running', async (): Promise<void> =>
        graphTaskHost.sendRuns({ 'app#build': 'running' }));

      await test.step('THEN the same slot reads Stop and keeps focus', async (): Promise<void> =>
        graphTaskToolbar.expectButtonFocused('app#build', 'Stop app#build'));

      await test.step('WHEN Enter is pressed', async (): Promise<void> => graphKeys.press('Enter'));

      await test.step('THEN the page posted the stop after the run', async (): Promise<void> =>
        graphTaskHost.expectTaskPosts([RUN_APP, STOP_APP]));
    }
  );

  test(
    'GIVEN app#build tapped, Show package lands in package mode with app selected',
    { annotation: D6 },
    async ({ graphCanvas, graphDetails, graphNodeToolbar, graphProbe, graphTask, graphTaskToolbar }): Promise<void> => {
      await test.step('WHEN app#build is tapped', async (): Promise<void> => graphCanvas.tapNode('app#build'));

      await test.step('AND Show package app is pressed', async (): Promise<void> =>
        graphTaskToolbar.buttonOf('app#build', 'Show package app').click());

      await test.step('THEN the page is in package mode', async (): Promise<void> => graphTask.expectPressed(false));

      await test.step('AND app is selected', async (): Promise<void> => graphProbe.expectSelected('app'));

      await test.step('AND the details panel shows app', async (): Promise<void> => graphDetails.expectHeading('app'));

      await test.step('AND the package toolbar of app is in view', async (): Promise<void> =>
        graphNodeToolbar.expectNodeToolbarInView('app'));
    }
  );

  test(
    'GIVEN app#build tapped, at zoom under 0.5 the toolbar holds only the "…", and at full zoom all three buttons again',
    { annotation: D6 },
    async ({ graphCanvas, graphTaskToolbar }): Promise<void> => {
      await test.step('WHEN app#build is tapped and the canvas zooms out to compact', async (): Promise<void> => {
        await graphCanvas.tapNode('app#build');
        await graphTaskToolbar.zoomOutToCompact();
        await graphTaskToolbar.expectNodeInView('app#build');
      });

      await test.step('THEN the toolbar holds the "…" alone', async (): Promise<void> =>
        graphTaskToolbar.expectToolbarButtons('app#build', ['Actions for app#build']));

      await test.step('WHEN the canvas zooms back in', async (): Promise<void> => graphTaskToolbar.zoomInToFull());

      await test.step('THEN the toolbar holds the three buttons', async (): Promise<void> =>
        graphTaskToolbar.expectToolbarButtons('app#build', FULL_BUTTONS));
    }
  );

  test(
    'GIVEN app#build tapped and the container focused, Tab enters the task toolbar once and the arrow keys walk its buttons',
    { annotation: D9 },
    async ({ graphCanvas, graphKeys, graphPage, graphTaskToolbar, graphWidgets }): Promise<void> => {
      await test.step('WHEN app#build is tapped, the container is focused and Tab is pressed', async (): Promise<void> => {
        await graphCanvas.tapNode('app#build');
        await graphTaskToolbar.expectNodeInView('app#build');
        await graphWidgets.focusContainer();
        await graphKeys.press('Tab');
      });

      await test.step('THEN Run has focus', async (): Promise<void> =>
        graphTaskToolbar.expectButtonFocused('app#build', 'Run app#build'));

      await test.step('WHEN Right is pressed', async (): Promise<void> => graphKeys.press('ArrowRight'));

      await test.step('THEN Show package has focus', async (): Promise<void> =>
        graphTaskToolbar.expectButtonFocused('app#build', 'Show package app'));

      await test.step('WHEN End is pressed', async (): Promise<void> => graphKeys.press('End'));

      await test.step('THEN the "…" has focus', async (): Promise<void> =>
        graphTaskToolbar.expectButtonFocused('app#build', 'Actions for app#build'));

      await test.step('WHEN Shift+Tab is pressed', async (): Promise<void> => graphKeys.press('Shift+Tab'));

      await test.step('THEN the container has focus: no other toolbar button is a Tab stop', async (): Promise<void> =>
        graphPage.expectContainerFocused());

      await test.step('WHEN Tab is pressed again', async (): Promise<void> => graphKeys.press('Tab'));

      await test.step('THEN the "…" has focus: the toolbar is one Tab stop and keeps it', async (): Promise<void> =>
        graphTaskToolbar.expectButtonFocused('app#build', 'Actions for app#build'));

      await test.step('WHEN Right is pressed again', async (): Promise<void> => graphKeys.press('ArrowRight'));

      await test.step('THEN Run has focus, wrapping', async (): Promise<void> =>
        graphTaskToolbar.expectButtonFocused('app#build', 'Run app#build'));
    }
  );

  test(
    'GIVEN the task toolbar with Run focused, Shift+F10 opens no menu',
    { annotation: D9 },
    async ({ graphCanvas, graphKeys, graphMenus, graphTaskToolbar, graphWidgets }): Promise<void> => {
      // eslint-disable-next-line playwright/no-skipped-test -- macOS Chromium never fires the event this test watches
      test.skip(IS_SHIFT_F10_SILENT, SHIFT_F10_SILENT_REASON);

      await test.step('WHEN app#build is tapped and Run is reached by Tab', async (): Promise<void> => {
        await graphCanvas.tapNode('app#build');
        await graphTaskToolbar.expectNodeInView('app#build');
        await graphWidgets.focusContainer();
        await graphKeys.press('Tab');
        await graphTaskToolbar.expectButtonFocused('app#build', 'Run app#build');
      });

      await test.step('AND Shift+F10 is pressed and the page settles', async (): Promise<void> => {
        await graphMenus.pressKey('Shift+F10');
        await graphTaskToolbar.settle();
      });

      await test.step('THEN no menu is open', async (): Promise<void> => graphMenus.expectNoMenu());
    }
  );
});

test.describe('FEATURE: the root task node toolbar', () => {
  test(
    'GIVEN the root task //#lint tapped, its toolbar holds Run and the "…" without Show package',
    { annotation: D6 },
    async ({ graphCanvas, graphHost, graphPage, graphTaskProbe, graphTaskToolbar }): Promise<void> => {
      await test.step('WHEN a cold open in task mode with //#lint chosen is tapped', async (): Promise<void> => {
        await graphPage.open({ savedState: taskSavedState('7a5c0020', { chosen: ['//#lint'] }) });
        await graphHost.sendState(TASK_ROOT_STATE_STUB);
        await graphTaskProbe.expectTaskIds(['//#lint']);
        await graphCanvas.tapNode('//#lint');
      });

      await test.step('THEN its toolbar holds Run and the "…"', async (): Promise<void> =>
        graphTaskToolbar.expectToolbarButtons('//#lint', ['Run //#lint', 'Actions for //#lint']));
    }
  );
});
