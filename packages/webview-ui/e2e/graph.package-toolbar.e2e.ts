import { IS_SHIFT_F10_SILENT, SHIFT_F10_SILENT_REASON } from './common/graph.const.ts';
import type { GraphOptions } from './common/graph.type.ts';
import { test } from './graph-task.fixture.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { groupedSavedState, savedWith } from './test/utils/graph-saved-state.spec.util.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';

const D1 = { description: 'U4 D1', type: 'requirement' };

const D4 = { description: 'U4 D4', type: 'requirement' };

const D5 = { description: 'U4 D5', type: 'requirement' };

const BOARDS = placedBoardsState();

/** Another hash than the task stub's, so the camera fits the new graph instead of restoring a saved one. */
const OTHER_HASH = '7a5c00ff';

const GROUPED_TASKS: GraphViewState = groupedSavedState(OTHER_HASH);

const FLAT_TASKS: GraphViewState = { ...GROUPED_TASKS, grouped: false };

const FULL_BUTTONS = ['Focus app', 'Start trace', 'Show tasks', 'Actions for app'];

const GROUPED_BUTTONS = ['Focus app', 'Start trace', 'Show tasks', 'Collapse folder packages', 'Actions for app'];

const APP_SET = ['app#build', 'app#lint', 'lib#build', 'ui#build'];

const HELD: GraphOptions = { workers: 'held' };

const WEB_ITEMS = ['View Package Details', 'Focus', 'Start trace', 'Exclude'];

test.describe('FEATURE: package node toolbar', () => {
  test(
    'GIVEN the boards flat with web picked, Shift+F10 on the graph opens the package menu',
    { annotation: D5 },
    async ({ graphFolderInspect, graphList, graphMenus, graphNodeToolbar, graphWidgets }): Promise<void> => {
      // eslint-disable-next-line playwright/no-skipped-test -- macOS Chromium never fires the event this test watches
      test.skip(IS_SHIFT_F10_SILENT, SHIFT_F10_SILENT_REASON);

      await test.step('WHEN the flat boards open and web is picked', async (): Promise<void> => {
        await graphFolderInspect.open(savedWith(BOARDS.hash, { grouped: false }), BOARDS);
        await graphList.pick('web');
        await graphNodeToolbar.expectNodeInView('web');
      });

      await test.step('AND the container is focused and Shift+F10 is pressed', async (): Promise<void> => {
        await graphWidgets.focusContainer();
        await graphMenus.pressShiftF10();
      });

      await test.step('THEN the web menu lists its items', async (): Promise<void> => graphMenus.expectItems(WEB_ITEMS));
    }
  );

  test(
    'GIVEN the boards flat, picking web shows its toolbar above it and picking docs moves the one toolbar there',
    { annotation: D1 },
    async ({ graphFolderInspect, graphList, graphNodeToolbar }): Promise<void> => {
      await test.step('WHEN the flat boards open and web is picked', async (): Promise<void> => {
        await graphFolderInspect.open(savedWith(BOARDS.hash, { grouped: false }), BOARDS);
        await graphList.pick('web');
        await graphNodeToolbar.expectNodeInView('web');
      });

      await test.step('THEN the web toolbar sits 4 px above web', async (): Promise<void> =>
        graphNodeToolbar.expectNodeToolbarOn('web', 'above'));

      await test.step('WHEN docs is picked', async (): Promise<void> => {
        await graphList.pick('docs');
        await graphNodeToolbar.expectNodeInView('docs');
      });

      await test.step('THEN the one toolbar sits 4 px above docs', async (): Promise<void> =>
        graphNodeToolbar.expectNodeToolbarOn('docs', 'above'));
    }
  );

  test(
    'GIVEN the boards flat with web picked, clicking its toolbar "…" opens the package menu',
    { annotation: D5 },
    async ({ graphFolderInspect, graphList, graphMenus, graphNodeToolbar }): Promise<void> => {
      await test.step('WHEN the flat boards open and web is picked', async (): Promise<void> => {
        await graphFolderInspect.open(savedWith(BOARDS.hash, { grouped: false }), BOARDS);
        await graphList.pick('web');
        await graphNodeToolbar.expectNodeInView('web');
      });

      await test.step('AND the toolbar "…" is clicked', async (): Promise<void> => graphMenus.openPackageMenu('web'));

      await test.step('THEN the web menu lists its items', async (): Promise<void> => graphMenus.expectItems(WEB_ITEMS));
    }
  );

  test(
    'GIVEN the flat task packages with app picked, its toolbar shows Focus, Start trace, Show tasks and "…" above it',
    { annotation: D4 },
    async ({ graphFolderInspect, graphList, graphNodeToolbar }): Promise<void> => {
      await test.step('WHEN the flat packages open and app is picked', async (): Promise<void> => {
        await graphFolderInspect.open(FLAT_TASKS, TASK_MODE_STATE_STUB);
        await graphList.pick('app');
        await graphNodeToolbar.expectNodeInView('app');
      });

      await test.step('THEN the toolbar shows those four buttons', async (): Promise<void> =>
        graphNodeToolbar.expectToolbarButtons('app', FULL_BUTTONS));

      await test.step('AND it sits 4 px above app', async (): Promise<void> => graphNodeToolbar.expectNodeToolbarOn('app', 'above'));
    }
  );

  test(
    'GIVEN the flat task packages with app picked, its toolbar Focus button focuses app and a second press clears it',
    { annotation: D4 },
    async ({ graphFolderInspect, graphList, graphNodeToolbar }): Promise<void> => {
      await test.step('WHEN the flat packages open and app is picked', async (): Promise<void> => {
        await graphFolderInspect.open(FLAT_TASKS, TASK_MODE_STATE_STUB);
        await graphList.pick('app');
        await graphNodeToolbar.expectNodeInView('app');
      });

      await test.step('AND Focus app is pressed', async (): Promise<void> => graphNodeToolbar.buttonOf('app', 'Focus app').click());

      await test.step('THEN the toolbar Focus is pressed', async (): Promise<void> =>
        graphNodeToolbar.expectFocusPressed('app', true));

      await test.step('AND the list Focus is pressed', async (): Promise<void> => graphList.expectFocusPressed('app', true));

      await test.step('WHEN Focus app is pressed again', async (): Promise<void> =>
        graphNodeToolbar.buttonOf('app', 'Focus app').click());

      await test.step('THEN the toolbar Focus is not pressed', async (): Promise<void> =>
        graphNodeToolbar.expectFocusPressed('app', false));

      await test.step('AND the list Focus is not pressed', async (): Promise<void> => graphList.expectFocusPressed('app', false));
    }
  );

  test(
    'GIVEN the flat task packages with app picked, its toolbar Start trace opens the picker and the toolbar goes',
    { annotation: D4 },
    async ({ graphFolderInspect, graphList, graphNodeToolbar, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN the flat packages open and app is picked', async (): Promise<void> => {
        await graphFolderInspect.open(FLAT_TASKS, TASK_MODE_STATE_STUB);
        await graphList.pick('app');
        await graphNodeToolbar.expectNodeInView('app');
      });

      await test.step('AND Start trace is pressed', async (): Promise<void> =>
        graphNodeToolbar.buttonOf('app', 'Start trace').click());

      await test.step('THEN the details panel picks the trace end', async (): Promise<void> => graphTrace.expectPicking('app'));

      await test.step('AND no node toolbar is drawn', async (): Promise<void> => graphNodeToolbar.expectNoNodeToolbar());

      await test.step('AND the graph container has focus', async (): Promise<void> => graphPage.expectContainerFocused());
    }
  );

  test(
    'GIVEN the flat task packages with app picked, its toolbar Show tasks draws app tasks and hides the toolbar',
    { annotation: D4 },
    async ({ graphFolderInspect, graphList, graphNodeToolbar, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the flat packages open and app is picked', async (): Promise<void> => {
        await graphFolderInspect.open(FLAT_TASKS, TASK_MODE_STATE_STUB);
        await graphList.pick('app');
        await graphNodeToolbar.expectNodeInView('app');
      });

      await test.step('AND Show tasks is pressed', async (): Promise<void> => graphNodeToolbar.buttonOf('app', 'Show tasks').click());

      await test.step("THEN app's tasks and their chain are drawn", async (): Promise<void> => graphTaskProbe.expectTaskIds(APP_SET));

      await test.step('AND the package toolbar is hidden', async (): Promise<void> => graphNodeToolbar.expectToolbarHidden('app'));
    }
  );

  test(
    'GIVEN the grouped task packages with app picked, its toolbar Collapse folder collapses packages and selects the folder',
    { annotation: D4 },
    async ({ graphDetails, graphFolderInspect, graphGrouping, graphList, graphNodeToolbar, graphPage }): Promise<void> => {
      await test.step('WHEN the grouped packages open and app is picked', async (): Promise<void> => {
        await graphFolderInspect.open(GROUPED_TASKS, TASK_MODE_STATE_STUB);
        await graphList.pick('app');
        await graphNodeToolbar.expectNodeInView('app');
      });

      await test.step('THEN the toolbar adds Collapse folder packages before the "…"', async (): Promise<void> =>
        graphNodeToolbar.expectToolbarButtons('app', GROUPED_BUTTONS));

      await test.step('WHEN Collapse folder packages is pressed', async (): Promise<void> =>
        graphNodeToolbar.buttonOf('app', 'Collapse folder packages').click());

      await test.step('THEN the packages folder is collapsed', async (): Promise<void> =>
        graphGrouping.expectFolderCollapsed('packages', true));

      await test.step('AND the details panel is headed packages', async (): Promise<void> => graphDetails.expectHeading('packages'));

      await test.step('AND no node toolbar is drawn', async (): Promise<void> => graphNodeToolbar.expectNoNodeToolbar());

      await test.step('AND the graph container has focus', async (): Promise<void> => graphPage.expectContainerFocused());
    }
  );

  test(
    'GIVEN the flat task packages with app picked, zooming out leaves only the toolbar "…" and zooming back in restores the buttons',
    { annotation: D4 },
    async ({ graphFolderInspect, graphList, graphNodeToolbar }): Promise<void> => {
      await test.step('WHEN the flat packages open and app is picked', async (): Promise<void> => {
        await graphFolderInspect.open(FLAT_TASKS, TASK_MODE_STATE_STUB);
        await graphList.pick('app');
        await graphNodeToolbar.expectNodeInView('app');
      });

      await test.step('AND the canvas is zoomed out under the compact rule', async (): Promise<void> =>
        graphNodeToolbar.zoomOutToCompact());

      await test.step('THEN app is still in view', async (): Promise<void> => graphNodeToolbar.expectNodeInView('app'));

      await test.step('AND the toolbar shows only its "…"', async (): Promise<void> =>
        graphNodeToolbar.expectToolbarButtons('app', ['Actions for app']));

      await test.step('WHEN the canvas is zoomed back in over the rule', async (): Promise<void> => graphNodeToolbar.zoomInToFull());

      await test.step('THEN the toolbar shows its four buttons again', async (): Promise<void> =>
        graphNodeToolbar.expectToolbarButtons('app', FULL_BUTTONS));
    }
  );

  test(
    'GIVEN the boards with a switch to flat still laying out, the toolbar Focus web does nothing',
    { annotation: D4 },
    async ({ graphFolderInspect, graphGrouping, graphList, graphNodeToolbar }): Promise<void> => {
      await test.step('WHEN the grouped boards open with the flat layout held and web is picked', async (): Promise<void> => {
        await graphFolderInspect.open(savedWith(BOARDS.hash, {}), BOARDS, HELD);
        await graphList.pick('web');
        await graphNodeToolbar.expectNodeInView('web');
      });

      await test.step('AND Group by folder is unchecked', async (): Promise<void> => graphGrouping.setGrouped(false));

      await test.step('AND the web toolbar Focus web, still drawn, is pressed', async (): Promise<void> =>
        graphNodeToolbar.buttonOf('web', 'Focus web').click());

      await test.step('THEN the toolbar Focus stays unpressed', async (): Promise<void> =>
        graphNodeToolbar.expectFocusPressed('web', false));

      await test.step('AND the list Focus stays unpressed', async (): Promise<void> => graphList.expectFocusPressed('web', false));
    }
  );

  test(
    'GIVEN the grouped task packages with app picked, the toolbar "…" opens its menu at the "…", not at the toolbar',
    { annotation: D4 },
    async ({ graphFolderInspect, graphList, graphMenus, graphNodeToolbar }): Promise<void> => {
      await test.step('WHEN the grouped packages open and app is picked', async (): Promise<void> => {
        await graphFolderInspect.open(GROUPED_TASKS, TASK_MODE_STATE_STUB);
        await graphList.pick('app');
        await graphNodeToolbar.expectNodeInView('app');
      });

      await test.step('AND the toolbar "…" is pressed', async (): Promise<void> => graphMenus.openPackageMenu('app'));

      await test.step('THEN the menu opens within 24 px of the "…" left edge', async (): Promise<void> =>
        graphNodeToolbar.expectMenuOnEllipsis('app'));
    }
  );
});
