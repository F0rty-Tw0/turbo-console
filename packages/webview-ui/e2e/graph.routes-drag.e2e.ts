import { test } from './graph-routes.fixture.ts';
import { U0_STATE_STUB } from './test/stubs/graph-u0.stub.ts';
import {
  ALL_EDGE_IDS,
  FLAT_SAVED,
  GROUPED_SAVED,
  LIBS_UI,
  LIBS_UI_EDGE_IDS,
  REST_EDGE_IDS,
  UI,
  UI_EDGE_IDS
} from './test/utils/graph-u0-routes.spec.util.ts';

const U0 = U0_STATE_STUB;

test.describe('FEATURE: a drag straightens only the edges it moved', () => {
  test('GIVEN the U0 workspace laid out flat, dragging @company/ui straightens its 6 edges, and the posted cache keeps that (b5)', async ({
    graphCanvas,
    graphHost,
    graphPage,
    graphProbe,
    graphRoutes
  }): Promise<void> => {
    await test.step('WHEN the page is opened and the U0 state is sent', async (): Promise<void> => {
      await graphPage.open({ savedState: FLAT_SAVED });
      await graphHost.sendState(U0);
    });

    await test.step('AND ELK has laid it out', async (): Promise<void> => {
      await graphProbe.expectLayoutEngine('elk');
      await graphRoutes.expectEveryLineRouted(ALL_EDGE_IDS.length);
    });

    await test.step('AND @company/ui is dragged by 40 px right and 30 px down', async (): Promise<void> =>
      graphCanvas.dragNode(UI, 40, 30));

    await test.step('THEN its 6 edges are straight and the other 22 routed', async (): Promise<void> =>
      graphRoutes.expectRoutedExcept(UI_EDGE_IDS));

    await test.step('AND the posted routes lack those 6', async (): Promise<void> => graphRoutes.expectPostedRouteIds(REST_EDGE_IDS));

    await test.step('WHEN the page is reopened with that post cached', async (): Promise<void> => {
      await graphRoutes.reopenWithPostedFlatCached(U0);
      await graphProbe.expectLayoutEngine('cache');
    });

    await test.step('THEN the same 6 edges are straight and the other 22 routed', async (): Promise<void> =>
      graphRoutes.expectRoutedExcept(UI_EDGE_IDS));
  });

  test('GIVEN the U0 workspace laid out grouped and fitted, dragging @company/ui straightens its 6 edges (b5)', async ({
    graphCanvas,
    graphHost,
    graphPage,
    graphProbe,
    graphRoutes
  }): Promise<void> => {
    await test.step('WHEN the page is opened grouped and the U0 state is sent', async (): Promise<void> => {
      await graphPage.open({ savedState: GROUPED_SAVED });
      await graphHost.sendState(U0);
    });

    await test.step('AND ELK has laid it out', async (): Promise<void> => {
      await graphProbe.expectLayoutEngine('elk');
      await graphRoutes.expectEveryLineRouted(ALL_EDGE_IDS.length);
    });

    await test.step('AND Fit is pressed and @company/ui is in view', async (): Promise<void> => {
      await graphPage.pressButton('Fit');
      await graphRoutes.expectNodeInView(UI, graphCanvas.container);
    });

    await test.step('AND @company/ui is dragged by 40 px right and 30 px down', async (): Promise<void> =>
      graphCanvas.dragNode(UI, 40, 30));

    await test.step('THEN its 6 edges are straight and the other 22 routed', async (): Promise<void> =>
      graphRoutes.expectRoutedExcept(UI_EDGE_IDS));
  });

  test('GIVEN the U0 workspace laid out grouped, dragging the libs/ui box straightens every edge with an end in its 4 packages (b5)', async ({
    graphGrouping,
    graphHost,
    graphPage,
    graphProbe,
    graphRoutes
  }): Promise<void> => {
    await test.step('WHEN the page is opened grouped and the U0 state is sent', async (): Promise<void> => {
      await graphPage.open({ savedState: GROUPED_SAVED });
      await graphHost.sendState(U0);
    });

    await test.step('AND ELK has laid it out', async (): Promise<void> => {
      await graphProbe.expectLayoutEngine('elk');
      await graphRoutes.expectEveryLineRouted(ALL_EDGE_IDS.length);
    });

    await test.step('AND the libs/ui box is dragged by 60 px right and 40 px down', async (): Promise<void> =>
      graphGrouping.dragBox(LIBS_UI, 60, 40));

    await test.step('THEN every edge with an end in libs/ui is straight and the rest routed', async (): Promise<void> =>
      graphRoutes.expectRoutedExcept(LIBS_UI_EDGE_IDS));
  });
});
