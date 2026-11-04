import type { ViewportSize } from './common/playwright.type.ts';
import { test } from './graph-open-zoom.fixture.ts';
import { FLAT_SAVED_STUB } from './test/stubs/graph-saved.stub.ts';
import { largeState } from './test/utils/graph-large.spec.util.ts';
import { targetLikeState } from './test/utils/graph-target-like.spec.util.ts';
import { taskCanvasShotSetup } from './test/utils/graph-task-canvas.spec.util.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';
import { FIT_PADDING_PX, OPEN_ZOOM_FLOOR } from '../src/graph/common/graph-layout.const.ts';
import { FIT_LABEL, RELAYOUT_LABEL } from '../src/graph/common/graph.const.ts';

const U6E = { description: 'U6e D10 AC2 AC5', type: 'requirement' };

/** Every `largeState(n)` from 20 packages up fits at 0.2944 on a 1280 x 720 page: a 20-column grid is width-bound. */
const BIG = largeState(40);

const TASK_PAGE: ViewportSize = { width: 640, height: 400 };

/** A saved view of `BIG` left fitted, as a Fit press saves it. */
const fittedSave = (): GraphViewState => {
  const saved: GraphViewState = { ...FLAT_SAVED_STUB, hash: BIG.hash, fitted: true };

  return saved;
};

test.describe('FEATURE: opening zoom floor', () => {
  test(
    'GIVEN a big graph and no saved camera, the page opens at the floor, top-centred, with Fit enabled',
    { annotation: U6E },
    async ({ graphOpenZoom, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened and the big graph is sent', async (): Promise<void> => graphOpenZoom.openWith(BIG));

      await test.step('THEN the zoom is the floor', async (): Promise<void> => graphOpenZoom.expectZoom(OPEN_ZOOM_FLOOR));

      await test.step('AND the graph top sits 24 px below the canvas top, centred', async (): Promise<void> =>
        graphOpenZoom.expectTopCentred(FIT_PADDING_PX));

      await test.step('AND Fit is enabled', async (): Promise<void> => graphPage.expectEnabled(FIT_LABEL));
    }
  );

  test(
    'GIVEN the floored open, pressing Fit twice lands on the same true fit, below the floor',
    { annotation: U6E },
    async ({ graphOpenZoom, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened and the big graph is sent', async (): Promise<void> => graphOpenZoom.openWith(BIG));

      await test.step('THEN the zoom is the floor', async (): Promise<void> => graphOpenZoom.expectZoom(OPEN_ZOOM_FLOOR));

      await test.step('WHEN Fit is pressed', async (): Promise<void> => graphPage.pressButton(FIT_LABEL));

      await test.step('THEN the zoom is below the floor', async (): Promise<void> => graphOpenZoom.expectZoomBelowFloor());

      await test.step('AND a second Fit press keeps the same zoom', async (): Promise<void> => graphOpenZoom.expectFitKeepsZoom());
    }
  );

  test(
    'GIVEN the floored open, the saved view holds the floor and is not fitted',
    { annotation: U6E },
    async ({ graphOpenZoom, graphTaskHost }): Promise<void> => {
      await test.step('WHEN the page is opened and the big graph is sent', async (): Promise<void> => graphOpenZoom.openWith(BIG));

      await test.step('THEN the zoom is the floor', async (): Promise<void> => graphOpenZoom.expectZoom(OPEN_ZOOM_FLOOR));

      await test.step('AND the saved view holds the floor and fitted false', async (): Promise<void> =>
        graphTaskHost.expectSaved({ hash: BIG.hash, zoom: OPEN_ZOOM_FLOOR, fitted: false }));
    }
  );

  test(
    'GIVEN the floored open saved, reopening with that saved view keeps the floor',
    { annotation: U6E },
    async ({ graphOpenZoom, graphTaskHost }): Promise<void> => {
      await test.step('WHEN the page is opened and the big graph is sent', async (): Promise<void> => graphOpenZoom.openWith(BIG));

      await test.step('THEN the saved view holds the floor', async (): Promise<void> =>
        graphTaskHost.expectSaved({ hash: BIG.hash, zoom: OPEN_ZOOM_FLOOR }));

      await test.step('WHEN the page is reopened with that saved view and the graph is sent again', async (): Promise<void> =>
        graphOpenZoom.reopenWith(BIG));

      await test.step('THEN the zoom is the floor again', async (): Promise<void> => graphOpenZoom.expectZoom(OPEN_ZOOM_FLOOR));
    }
  );

  test(
    'GIVEN a same-hash saved view left fitted, the page opens at the true fit, below the floor',
    { annotation: U6E },
    async ({ graphOpenZoom }): Promise<void> => {
      await test.step('WHEN the page is opened with the fitted save and the big graph is sent', async (): Promise<void> =>
        graphOpenZoom.openWith(BIG, { savedState: fittedSave() }));

      await test.step('THEN the zoom is below the floor', async (): Promise<void> => graphOpenZoom.expectZoomBelowFloor());

      await test.step('AND it equals the zoom after a Fit press', async (): Promise<void> => graphOpenZoom.expectOpenedAtFit());
    }
  );

  test(
    'GIVEN a graph whose fit is above the floor and no saved camera, the page opens at the true fit',
    { annotation: U6E },
    async ({ graphOpenZoom }): Promise<void> => {
      await test.step('WHEN the page is opened and the target-like graph is sent', async (): Promise<void> =>
        graphOpenZoom.openWith(targetLikeState()));

      await test.step('THEN the zoom equals the zoom after a Fit press', async (): Promise<void> => graphOpenZoom.expectOpenedAtFit());
    }
  );

  test(
    'GIVEN a task layout with no layout key on a small page, it opens at the floor and Re-layout fits',
    { annotation: U6E },
    async ({ graphOpenZoom, graphPage, graphProbe }): Promise<void> => {
      const { state, saved } = taskCanvasShotSetup();

      await test.step('WHEN the page is opened small, in task mode, and the task graph is sent', async (): Promise<void> =>
        graphOpenZoom.openWith(state, { savedState: saved, viewport: TASK_PAGE }));

      await test.step('THEN ELK lays the task graph out', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

      await test.step('AND the zoom is the floor', async (): Promise<void> => graphOpenZoom.expectZoom(OPEN_ZOOM_FLOOR));

      await test.step('WHEN Re-layout is pressed', async (): Promise<void> => graphPage.pressButton(RELAYOUT_LABEL));

      await test.step('THEN the zoom is the true fit, below the floor', async (): Promise<void> =>
        graphOpenZoom.expectZoomBelowFloor());
    }
  );
});
