import { test } from './graph-task.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';
import { START_TRACE_LABEL } from '../src/graph/common/details.const.ts';
import { DEPENDENTS_DEPTH_HINT, DEPENDENTS_DEPTH_LABEL } from '../src/graph/common/graph-task.const.ts';
import { DEPTH_HINT, DEPTH_LABEL } from '../src/graph/common/graph.const.ts';

const BOARDS = placedBoardsState();

const D3 = { description: '2026-10-26-u2-quick-wins D3', type: 'requirement' };

test.describe('FEATURE: depth hints and the Start trace title', () => {
  test(
    'GIVEN the Controls panel, Focus depth is described by its hint, shown below the input',
    { annotation: D3 },
    async ({ graphDepthHints, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened and the details graph is sent', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
      });

      await test.step('THEN the depth input is described by the hint and the hint sits below it', async (): Promise<void> =>
        graphDepthHints.expectHint(DEPTH_LABEL, DEPTH_HINT));
    }
  );

  test(
    'GIVEN task mode, Dependents depth is described by its hint, shown below the input',
    { annotation: D3 },
    async ({ graphDepthHints, openUmbrella }): Promise<void> => {
      await test.step('WHEN task mode opens on the umbrella', async (): Promise<void> => openUmbrella());

      await test.step('THEN the depth input is described by the hint and the hint sits below it', async (): Promise<void> =>
        graphDepthHints.expectHint(DEPENDENTS_DEPTH_LABEL, DEPENDENTS_DEPTH_HINT));
    }
  );

  test(
    `GIVEN web picked on the grouped boards, ${START_TRACE_LABEL} in the details panel and in the package menu carries the trace title`,
    { annotation: D3 },
    async ({ graphDepthHints, graphFolderInspect, graphList, graphMenus }): Promise<void> => {
      await test.step('WHEN the grouped boards open and web is picked', async (): Promise<void> => {
        await graphFolderInspect.open(savedWith(BOARDS.hash, {}), BOARDS);
        await graphList.pick('web');
      });

      await test.step('THEN the details button has the trace title', async (): Promise<void> => graphDepthHints.expectButtonTitle());

      await test.step('WHEN the package menu opens', async (): Promise<void> => graphMenus.openPackageMenu('web'));

      await test.step('THEN the menu item has the trace title', async (): Promise<void> => graphDepthHints.expectMenuItemTitle());
    }
  );
});
