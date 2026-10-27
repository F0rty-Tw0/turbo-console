import { expect, test } from './graph.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { SAVED_BASE_STUB } from './test/stubs/graph-saved.stub.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';

const FLAT_SAVED: GraphViewState = { ...SAVED_BASE_STUB, grouped: false };

test.describe('FEATURE: Group by folder default', () => {
  test('GIVEN nothing saved, the graph opens with Group by folder checked', async ({
    graphControls,
    graphGrouping,
    graphHost,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the page is opened with no saved state', async (): Promise<void> => graphPage.open({ savedState: null }));

    await test.step('AND a graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

    await test.step('THEN the Controls fact and the checkbox read grouped', async (): Promise<void> => {
      await graphControls.expectGroupedFact(true);
      await expect(graphGrouping.checkbox).toBeChecked();
    });
  });

  test('GIVEN a saved flat choice, the graph opens with Group by folder unchecked', async ({
    graphControls,
    graphGrouping,
    graphHost,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the page is opened with grouped false saved', async (): Promise<void> =>
      graphPage.open({ savedState: FLAT_SAVED }));

    await test.step('AND a graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

    await test.step('THEN the Controls fact and the checkbox read flat', async (): Promise<void> => {
      await graphControls.expectGroupedFact(false);
      await expect(graphGrouping.checkbox).not.toBeChecked();
    });
  });
});
