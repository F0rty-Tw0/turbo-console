import { test as graphTaskTest } from './graph-task.fixture.ts';
import { GraphOpenZoom } from './pages/graph-open-zoom.po.ts';
import { FLAT_SAVED_STUB } from './test/stubs/graph-saved.stub.ts';
import { largeState } from './test/utils/graph-large.spec.util.ts';
import { targetLikeState } from './test/utils/graph-target-like.spec.util.ts';
import { taskCanvasShotSetup } from './test/utils/graph-task-canvas.spec.util.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';
import { OPEN_ZOOM_FLOOR } from '../src/graph/common/graph-layout.const.ts';
import { FIT_LABEL, RELAYOUT_LABEL } from '../src/graph/common/graph.const.ts';

const U6E = { description: 'U6e D10 AC2 AC5', type: 'requirement' };

const FIT_PADDING_PX = 24;

/** Every `largeState(n)` from 20 packages up fits at 0.2944 on a 1280 x 720 page: a 20-column grid is width-bound. */
const BIG = largeState(40);

const TASK_PAGE = { width: 640, height: 400 };

type OpenZoomFixtures = {
  readonly graphOpenZoom: GraphOpenZoom;
};

const test = graphTaskTest.extend<OpenZoomFixtures>({
  graphOpenZoom: async ({ page }, use): Promise<void> => {
    await use(new GraphOpenZoom(page));
  }
});

/** A saved view of `BIG` left fitted, as a Fit press saves it. */
const fittedSave = (): GraphViewState => {
  const saved: GraphViewState = { ...FLAT_SAVED_STUB, hash: BIG.hash, fitted: true };

  return saved;
};

test.describe('FEATURE: opening zoom floor', () => {
  test(
    'GIVEN a big graph and no saved camera, the page opens at the floor, top-centred, with Fit enabled',
    { annotation: U6E },
    async ({ graphHost, graphOpenZoom, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened and the big graph is sent', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(BIG);
      });

      await test.step('THEN the zoom is the floor', async (): Promise<void> => graphOpenZoom.expectZoom(OPEN_ZOOM_FLOOR));

      await test.step('AND the graph top sits 24 px below the canvas top, centred', async (): Promise<void> =>
        graphOpenZoom.expectTopCentred(FIT_PADDING_PX));

      await test.step('AND Fit is enabled', async (): Promise<void> => graphPage.expectEnabled(FIT_LABEL));
    }
  );

  test(
    'GIVEN the floored open, pressing Fit twice lands on the same true fit, below the floor',
    { annotation: U6E },
    async ({ graphHost, graphOpenZoom, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened at the floor', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(BIG);
        await graphOpenZoom.expectZoom(OPEN_ZOOM_FLOOR);
      });

      await test.step('AND Fit is pressed', async (): Promise<void> => {
        await graphOpenZoom.fitZoom();
      });

      await test.step('THEN the zoom is below the floor', async (): Promise<void> => graphOpenZoom.expectZoomBelowFloor());

      await test.step('AND a second Fit press keeps the same zoom', async (): Promise<void> => graphOpenZoom.expectOpenedAtFit());
    }
  );

  test(
    'GIVEN the floored open, the saved view holds the floor and is not fitted',
    { annotation: U6E },
    async ({ graphHost, graphOpenZoom, graphPage, graphTaskHost }): Promise<void> => {
      await test.step('WHEN the page is opened at the floor', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(BIG);
        await graphOpenZoom.expectZoom(OPEN_ZOOM_FLOOR);
      });

      await test.step('THEN the saved view holds the floor and fitted false', async (): Promise<void> =>
        graphTaskHost.expectSaved({ hash: BIG.hash, zoom: OPEN_ZOOM_FLOOR, fitted: false }));
    }
  );

  test(
    'GIVEN the floored open saved, reopening with that saved view keeps the floor',
    { annotation: U6E },
    async ({ graphHost, graphOpenZoom, graphPage, graphTaskHost }): Promise<void> => {
      await test.step('WHEN the page is opened at the floor and the view is saved', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(BIG);
        await graphTaskHost.expectSaved({ hash: BIG.hash, zoom: OPEN_ZOOM_FLOOR });
      });

      await test.step('AND the page is reopened with that saved view and the graph is sent again', async (): Promise<void> => {
        await graphHost.reopen();
        await graphHost.sendState(BIG);
      });

      await test.step('THEN the zoom is the floor again', async (): Promise<void> => graphOpenZoom.expectZoom(OPEN_ZOOM_FLOOR));
    }
  );

  test(
    'GIVEN a same-hash saved view left fitted, the page opens at the true fit, below the floor',
    { annotation: U6E },
    async ({ graphHost, graphOpenZoom, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened with the fitted save and the big graph is sent', async (): Promise<void> => {
        await graphPage.open({ savedState: fittedSave() });
        await graphHost.sendState(BIG);
      });

      await test.step('THEN the zoom is below the floor', async (): Promise<void> => graphOpenZoom.expectZoomBelowFloor());

      await test.step('AND it equals the zoom after a Fit press', async (): Promise<void> => graphOpenZoom.expectOpenedAtFit());
    }
  );

  test(
    'GIVEN a graph whose fit is above the floor and no saved camera, the page opens at the true fit',
    { annotation: U6E },
    async ({ graphHost, graphOpenZoom, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened and the target-like graph is sent', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(targetLikeState());
      });

      await test.step('THEN the zoom equals the zoom after a Fit press', async (): Promise<void> => graphOpenZoom.expectOpenedAtFit());
    }
  );

  test(
    'GIVEN a task layout with no layout key on a small page, it opens at the floor and Re-layout fits',
    { annotation: U6E },
    async ({ graphHost, graphOpenZoom, graphPage, graphProbe }): Promise<void> => {
      const { state, saved } = taskCanvasShotSetup();

      await test.step('WHEN the page is made small, opened in task mode and the task graph is sent', async (): Promise<void> => {
        await graphOpenZoom.resizeTo(TASK_PAGE.width, TASK_PAGE.height);
        await graphPage.open({ savedState: saved });
        await graphHost.sendState(state);
        await graphProbe.expectLayoutEngine('elk');
      });

      await test.step('THEN the zoom is the floor', async (): Promise<void> => graphOpenZoom.expectZoom(OPEN_ZOOM_FLOOR));

      await test.step('WHEN Re-layout is pressed', async (): Promise<void> => graphPage.pressButton(RELAYOUT_LABEL));

      await test.step('THEN the zoom is the true fit, below the floor', async (): Promise<void> =>
        graphOpenZoom.expectZoomBelowFloor());
    }
  );
});
