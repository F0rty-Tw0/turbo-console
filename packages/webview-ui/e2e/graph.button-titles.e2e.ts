import { test } from './graph-task.fixture.ts';
import { DETAILS_RECOUNT_STUB, DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { FOUND_UI_STUB, UI_DEV_ENTRY_STUB, UI_ENTRIES_STUB, UI_ENTRY_STUB } from './test/stubs/graph-explain.stub.ts';
import { DIAMOND_CHAIN_STUB, ERROR_STUB } from './test/stubs/graph-state.stub.ts';
import { placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';
import { OVER_CAP_ROOT_TASK, TARGET_LIKE_UMBRELLA, overCapTasksState } from './test/utils/graph-target-like-tasks.spec.util.ts';

const D2 = { description: '2026-10-26-u2-quick-wins D2', type: 'requirement' };

const BOARDS = placedBoardsState();

const MOVED_ENTRY = { ...UI_ENTRY_STUB, line: UI_ENTRY_STUB.line + 10 };

/** `FOUND_UI_STUB` with the first entry moved ten lines down, so the Open button's name changes in place. */
const FOUND_UI_MOVED_STUB = { ...FOUND_UI_STUB, entries: [MOVED_ENTRY, UI_DEV_ENTRY_STUB] };

const MOVED_OPEN_NAME = `Open package.json at line ${MOVED_ENTRY.line + 1} (dependencies: ui)`;

test.describe('FEATURE: every graph button has a hover title', () => {
  test(
    'GIVEN the flat details graph, the toolbar, the Controls panel and the package details buttons all have a title',
    { annotation: D2 },
    async ({ graphButtonTitles, graphCanvas, graphControls, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened and the details graph is sent', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
      });

      await test.step('AND web is tapped and the Controls panel is opened', async (): Promise<void> => {
        await graphCanvas.tapNode('web');
        await graphControls.toggle();
      });

      await test.step('THEN every visible button has a title', async (): Promise<void> =>
        graphButtonTitles.expectAllTitled('flat, Details and Controls open'));

      await test.step('WHEN ui is tapped and the same graph with new task counts is sent', async (): Promise<void> => {
        await graphCanvas.tapNode('ui');
        await graphButtonTitles.expectTitledAs('View Package Details · 1 task');
        await graphHost.sendState(DETAILS_RECOUNT_STUB);
      });

      await test.step('THEN the Open details button title shows the new count', async (): Promise<void> =>
        graphButtonTitles.expectTitledAs('View Package Details · 2 tasks'));
    }
  );

  test(
    'GIVEN the grouped boards, the folder and package menus and the folder details buttons all have a title',
    { annotation: D2 },
    async ({ graphButtonTitles, graphFolderInspect, graphList, graphMenus }): Promise<void> => {
      await test.step('WHEN the grouped boards open and the apps menu opens', async (): Promise<void> => {
        await graphFolderInspect.open(savedWith(BOARDS.hash, {}), BOARDS);
        await graphMenus.openFolderMenu('apps');
      });

      await test.step('THEN every visible button has a title', async (): Promise<void> =>
        graphButtonTitles.expectAllTitled('grouped, folder menu open'));

      await test.step('WHEN web is picked and its package menu opens', async (): Promise<void> => {
        await graphMenus.pressKey('Escape');
        await graphList.pick('web');
        await graphMenus.openPackageMenu('web');
      });

      await test.step('THEN every visible button has a title', async (): Promise<void> =>
        graphButtonTitles.expectAllTitled('grouped, package menu open'));

      await test.step('WHEN the menu closes and the apps folder is tapped', async (): Promise<void> => {
        await graphMenus.pressKey('Escape');
        await graphFolderInspect.tapFolder('apps');
      });

      await test.step('THEN every visible button has a title', async (): Promise<void> =>
        graphButtonTitles.expectAllTitled('grouped, folder details'));

      await test.step('WHEN the folder details Collapse is pressed', async (): Promise<void> =>
        graphFolderInspect.pressAction('Collapse'));

      await test.step('THEN the button reads Expand and its title is Expand', async (): Promise<void> =>
        graphButtonTitles.expectTitledAs('Expand'));
    }
  );

  test(
    'GIVEN web selected, Start trace shows the picking buttons, all with a title',
    { annotation: D2 },
    async ({ graphButtonTitles, graphCanvas, graphDetails, graphHost, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN web is selected and Start trace is pressed', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
        await graphCanvas.tapNode('web');
        await graphDetails.startTrace();
      });

      await test.step('THEN picking starts from web', async (): Promise<void> => graphTrace.expectPicking('web'));

      await test.step('AND every visible button has a title', async (): Promise<void> =>
        graphButtonTitles.expectAllTitled('trace picking'));
    }
  );

  test(
    'GIVEN web selected, Focus becomes Clear focus and the button title follows',
    { annotation: D2 },
    async ({ graphButtonTitles, graphCanvas, graphDetails, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN web is selected and Focus is pressed', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
        await graphCanvas.tapNode('web');
        await graphDetails.focus();
      });

      await test.step('THEN the button reads Clear focus', async (): Promise<void> => graphDetails.expectFocusLabel('Clear focus'));

      await test.step('AND its title is Clear focus', async (): Promise<void> => graphButtonTitles.expectTitledAs('Clear focus'));

      await test.step('AND every visible button has a title', async (): Promise<void> =>
        graphButtonTitles.expectAllTitled('focus toggled'));
    }
  );

  test(
    'GIVEN task mode, a tapped task and then the cap banner have buttons that all have a title',
    { annotation: D2 },
    async ({ graphButtonTitles, graphCanvas, graphHost, graphTaskHost, graphTask, openUmbrella }): Promise<void> => {
      await test.step('WHEN the umbrella task is chosen and tapped', async (): Promise<void> => {
        await openUmbrella();
        await graphCanvas.tapNode(TARGET_LIKE_UMBRELLA);
      });

      await test.step('THEN every visible button has a title', async (): Promise<void> =>
        graphButtonTitles.expectAllTitled('task mode, task tapped'));

      await test.step('WHEN an over-cap state arrives and showTasks names its root', async (): Promise<void> => {
        await graphHost.sendState(overCapTasksState());
        await graphTaskHost.sendShowTasks([OVER_CAP_ROOT_TASK]);
      });

      await test.step('THEN the banner shows and every visible button has a title', async (): Promise<void> => {
        await graphTask.expectBanner(400);
        await graphButtonTitles.expectAllTitled('task mode, cap banner');
      });
    }
  );

  test(
    'GIVEN a layout fallback and then a host error, Retry and Reload have a title',
    { annotation: D2 },
    async ({ graphButtonTitles, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN a throwing worker falls back on the diamond graph', async (): Promise<void> => {
        await graphPage.open({ workers: 'throwOnce' });
        await graphHost.sendState(DIAMOND_CHAIN_STUB);
        await graphPage.expectFallbackNotice();
      });

      await test.step('THEN every visible button has a title', async (): Promise<void> =>
        graphButtonTitles.expectAllTitled('fallback notice with Retry'));

      await test.step('WHEN the host sends an error state', async (): Promise<void> => {
        await graphHost.sendState(ERROR_STUB);
        await graphPage.expectText('turbo exited with code 1');
      });

      await test.step('THEN every visible button has a title', async (): Promise<void> =>
        graphButtonTitles.expectAllTitled('error message with Reload'));
    }
  );

  test(
    'GIVEN the web to ui link answered, the found entry Open buttons have a title, also after an entry moves',
    { annotation: D2 },
    async ({ graphButtonTitles, graphHost, graphLink, graphPage, graphReplies }): Promise<void> => {
      await test.step('WHEN the web to ui link is tapped and the host answers with two entries', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
        await graphLink.tapLink('web', 'ui');
        await graphReplies.answerExplain(FOUND_UI_STUB);
      });

      await test.step('THEN both entries are listed', async (): Promise<void> => graphLink.expectEntries(UI_ENTRIES_STUB));

      await test.step('AND every visible button has a title', async (): Promise<void> =>
        graphButtonTitles.expectAllTitled('link details with Explain entries'));

      await test.step('WHEN the same graph is sent again and the host answers with the first entry moved', async (): Promise<void> => {
        await graphHost.sendState(DETAILS_RECOUNT_STUB);
        await graphReplies.answerExplain(FOUND_UI_MOVED_STUB);
      });

      await test.step('THEN the moved entry Open button title is its new name', async (): Promise<void> =>
        graphButtonTitles.expectTitledAs(MOVED_OPEN_NAME));
    }
  );
});
