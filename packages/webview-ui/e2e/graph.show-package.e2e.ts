import { test } from './graph-task.fixture.ts';
import { APPS_FOLDER_STUB, PACKAGES_FOLDER_STUB } from './test/stubs/graph-folder-facts.stub.ts';
import { placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { largeState } from './test/utils/graph-large.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';
import { taskViewOf } from './test/utils/graph-task-saved.spec.util.ts';
import { RELAYOUT_LABEL, REVEAL_ZOOM, REVEAL_ZOOM_MIN } from '../src/graph/common/graph.const.ts';

const U2_D7 = { description: 'U2 spec D7', type: 'requirement' };

const BOARDS = placedBoardsState();

const ALL_FIVE = ['@acme/config', '@acme/ui', '@acme/utils', 'docs', 'web'];

/** The boards in task mode, grouped, with `apps` collapsed and `web` excluded: three things that hide `web`. */
const WEB_BURIED = savedWith(BOARDS.hash, { mode: 'tasks', task: taskViewOf({}), hidden: ['web'], collapsed: ['apps'] });

/** Sixty packages on a cached flat grid, so the first place needs no worker; a chain of sixty layers once ELK lays it out. */
const CHAIN = largeState(60);

const LAST = 'pkg-059';

test.describe('FEATURE: graph Show package', () => {
  test(
    'GIVEN task mode on, web excluded and its folder collapsed, showPackage shows web selected in package mode',
    { annotation: U2_D7 },
    async ({
      graphCamera,
      graphDetails,
      graphFolders,
      graphHost,
      graphPage,
      graphReveal,
      graphTask,
      graphTaskHost
    }): Promise<void> => {
      await test.step('WHEN the boards open in task mode, grouped, with apps collapsed and web excluded', async (): Promise<void> => {
        await graphPage.open({ savedState: WEB_BURIED });
        await graphHost.sendState(BOARDS);
        await graphTask.expectPrompt();
      });

      await test.step('AND the host posts showPackage for web', async (): Promise<void> => graphTaskHost.sendShowPackage('web'));

      await test.step('THEN the page is in package mode', async (): Promise<void> => graphTask.expectPressed(false));

      await test.step('AND every package shows, web among them', async (): Promise<void> => graphCamera.expectVisible(ALL_FIVE));

      await test.step('AND apps is expanded', async (): Promise<void> =>
        graphFolders.expectFolders([APPS_FOLDER_STUB, PACKAGES_FOLDER_STUB]));

      await test.step('AND the details panel shows web', async (): Promise<void> => graphDetails.expectHeading('web'));

      await test.step('AND the zoom is at least 0.75', async (): Promise<void> => graphReveal.expectZoomAtLeast(REVEAL_ZOOM_MIN));

      await test.step('AND web sits inside the canvas, clear of the details panel', async (): Promise<void> =>
        graphReveal.expectPlaced('web'));

      await test.step('AND the page logged no errors', (): void => graphPage.expectNoErrors());
    }
  );

  test(
    'GIVEN a Re-layout in flight, showPackage selects the package at zoom 1 once the layout places and fits',
    { annotation: U2_D7 },
    async ({ graphDetails, graphGrouping, graphHost, graphPage, graphProbe, graphReveal, graphTaskHost }): Promise<void> => {
      await test.step('WHEN the chain opens flat from its cache with the workers held', async (): Promise<void> => {
        await graphPage.open({ workers: 'held' });
        await graphHost.sendState(CHAIN);
        await graphProbe.expectNodeCount(60);
      });

      await test.step('AND its fit zoom is under 0.75', async (): Promise<void> => graphReveal.expectZoomBelow(REVEAL_ZOOM_MIN));

      await test.step('AND Re-layout is pressed', async (): Promise<void> => graphPage.pressButton(RELAYOUT_LABEL));

      await test.step('AND the host posts showPackage for the last package at once', async (): Promise<void> =>
        graphTaskHost.sendShowPackage(LAST));

      await test.step('THEN nothing is selected while the layout runs', async (): Promise<void> => graphProbe.expectSelected(null));

      await test.step('AND the held layout lands', async (): Promise<void> => {
        await graphGrouping.releaseWorker();
        await graphHost.expectLayoutDones(['elk']);
      });

      await test.step('THEN the details panel shows the last package', async (): Promise<void> => graphDetails.expectHeading(LAST));

      await test.step('AND the zoom is 1, not the fit zoom', async (): Promise<void> => graphReveal.expectZoom(REVEAL_ZOOM));

      await test.step('AND the last package sits inside the canvas, clear of the details panel', async (): Promise<void> =>
        graphReveal.expectPlaced(LAST));

      await test.step('AND the page logged no errors', (): void => graphPage.expectNoErrors());
    }
  );
});
