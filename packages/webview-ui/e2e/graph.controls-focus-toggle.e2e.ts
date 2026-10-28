import { test } from './graph.fixture.ts';
import { CONTROLS_CACHED_STUB } from './test/stubs/graph-controls.stub.ts';

const D4 = { description: '2026-10-27-u3-controls-nav D4', type: 'requirement' };

test.describe('FEATURE: graph controls sections and Focus toggles', () => {
  test(
    'GIVEN the controls graph, the panel is split into the Search, View and Packages sections',
    { annotation: D4 },
    async ({ graphControls, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the controls graph is sent', async (): Promise<void> => graphHost.sendState(CONTROLS_CACHED_STUB));

      await test.step('THEN the panel headings read Search, View and Packages', async (): Promise<void> =>
        graphControls.expectSectionTitles(['Search', 'View', 'Packages']));
    }
  );
});
