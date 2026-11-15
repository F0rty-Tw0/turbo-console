import { test } from './graph-routes.fixture.ts';
import { U0_STATE_STUB } from './test/stubs/graph-u0.stub.ts';
import { GROUPED_SAVED, LIBS_UI } from './test/utils/graph-u0-routes.spec.util.ts';

const U0 = U0_STATE_STUB;

test.describe('FEATURE: every edge draws as a plain bezier under every box and card', () => {
  test('GIVEN the U0 workspace grouped WHEN libs/ui alone is collapsed THEN every package edge and folder link is a bezier drawn at the bottom', async ({
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

    await test.step('AND ELK has laid it out', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

    await test.step('AND libs/ui is collapsed from the list', async (): Promise<void> => graphFolders.toggleInList(LIBS_UI, true));

    await test.step('THEN every drawn package edge and folder link is a bezier under every box and card', async (): Promise<void> =>
      graphRoutes.expectEveryLinePlain());
  });

  test('GIVEN the U0 workspace grouped with every folder expanded THEN some package edge crosses a folder box that holds neither of its ends', async ({
    graphHost,
    graphPage,
    graphProbe,
    graphRoutes
  }): Promise<void> => {
    await test.step('WHEN the page is opened grouped and the U0 state is sent', async (): Promise<void> => {
      await graphPage.open({ savedState: GROUPED_SAVED });
      await graphHost.sendState(U0);
    });

    await test.step('AND ELK has laid it out', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

    await test.step('THEN some drawn line passes through a foreign folder box, not around it', async (): Promise<void> =>
      graphRoutes.expectSomeLineThroughForeignBoxes());
  });
});
