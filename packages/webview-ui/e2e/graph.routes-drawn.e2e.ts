import { test } from './graph-routes.fixture.ts';
import { U0_STATE_STUB } from './test/stubs/graph-u0.stub.ts';
import { ALL_EDGE_IDS, FLAT_SAVED, GROUPED_SAVED, LIBS_UI } from './test/utils/graph-u0-routes.spec.util.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';

type ModeRow = {
  readonly name: string;
  readonly saved: GraphViewState;
};

const U0 = U0_STATE_STUB;

const MODES: ModeRow[] = [
  { name: 'flat', saved: FLAT_SAVED },
  { name: 'grouped', saved: GROUPED_SAVED }
];

test.describe('FEATURE: U0 edges drawn on their routes', () => {
  for (const { name, saved } of MODES) {
    test(`GIVEN the U0 workspace laid out ${name}, every line is drawn on its route clear of the nodes (b2, b3)`, async ({
      graphHost,
      graphPage,
      graphProbe,
      graphRoutes
    }): Promise<void> => {
      await test.step(`WHEN the page is opened ${name} and the U0 state is sent`, async (): Promise<void> => {
        await graphPage.open({ savedState: saved });
        await graphHost.sendState(U0);
      });

      await test.step('AND ELK has laid it out', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

      await test.step('THEN all 28 lines are routed with at least 3 points (b2)', async (): Promise<void> =>
        graphRoutes.expectEveryLineRouted(ALL_EDGE_IDS.length));

      await test.step('AND no line passes through a node that is not one of its ends, 2 px inside it (b2)', async (): Promise<void> =>
        graphRoutes.expectNoLineThroughNodes());

      await test.step('AND no line has its midpoint inside a node box (b3)', async (): Promise<void> =>
        graphRoutes.expectNoMidpointUnderNode());
    });
  }

  test('GIVEN the U0 workspace laid out grouped, collapsing and expanding libs/ui leaves the 28 lines routed', async ({
    graphFolders,
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

    await test.step('AND libs/ui is collapsed and expanded in the list', async (): Promise<void> => {
      await graphFolders.toggleInList(LIBS_UI, true);
      await graphFolders.expectListToggle(LIBS_UI, false);
      await graphFolders.toggleInList(LIBS_UI, false);
      await graphFolders.expectListToggle(LIBS_UI, true);
    });

    await test.step('THEN the 28 lines are routed again', async (): Promise<void> =>
      graphRoutes.expectEveryLineRouted(ALL_EDGE_IDS.length));
  });

  test('GIVEN the U0 workspace laid out grouped, Fit keeps every line inside the canvas (b4)', async ({
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

    await test.step('AND Fit is pressed', async (): Promise<void> => graphPage.pressButton('Fit'));

    await test.step('THEN every line, bends included, lies inside the canvas', async (): Promise<void> =>
      graphRoutes.expectEveryLineInside(graphCanvas.container));
  });
});
