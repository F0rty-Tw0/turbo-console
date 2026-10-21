import { test } from './graph.fixture.ts';
import { DIAMOND_CHAIN_CACHED_STUB } from './test/stubs/graph-state.stub.ts';

const AC7 = { description: 'M4-1 AC7', type: 'requirement' };

const RF4 = { description: 'M4-1 Review Focus 4', type: 'requirement' };

test.describe('FEATURE: graph keyboard', () => {
  test(
    'GIVEN a selected package and the container focused, Enter posts openDetails for it',
    { annotation: AC7 },
    async ({ graphCanvas, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('AND core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

      await test.step('AND the container is focused', async (): Promise<void> => graphPage.focusContainer());

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN the host received openDetails for core', async (): Promise<void> => graphHost.expectOpenDetails('core'));
    }
  );

  test(
    'GIVEN no selection and the container focused, Enter posts nothing',
    { annotation: AC7 },
    async ({ graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('AND the graph is drawn from the cache', async (): Promise<void> => graphProbe.expectLayoutEngine('cache'));

      await test.step('AND the container is focused', async (): Promise<void> => graphPage.focusContainer());

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN no openDetails was posted', async (): Promise<void> => graphHost.expectNoOpenDetails());
    }
  );

  test(
    'GIVEN a selection and a focused toolbar button, Enter and Escape act on the button only',
    { annotation: RF4 },
    async ({ graphCanvas, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('AND core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

      await test.step('AND the Fit button is focused', async (): Promise<void> => graphPage.focusButton('Fit'));

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN no openDetails was posted', async (): Promise<void> => graphHost.expectNoOpenDetails());

      await test.step('WHEN Escape is pressed', async (): Promise<void> => graphPage.pressKey('Escape'));

      await test.step('THEN core is still selected', async (): Promise<void> => graphProbe.expectSelected('core'));

      await test.step('WHEN the Clear selection button is focused and Enter is pressed', async (): Promise<void> =>
        graphPage.pressOnButton('Clear selection', 'Enter'));

      await test.step('THEN the selection is cleared', async (): Promise<void> => graphProbe.expectSelected(null));

      await test.step('AND still no openDetails was posted', async (): Promise<void> => graphHost.expectNoOpenDetails());
    }
  );

  test(
    'GIVEN no selection, Tab walks Fit, Re-layout, then the graph container',
    { annotation: AC7 },
    async ({ graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('AND the graph is drawn from the cache', async (): Promise<void> => graphProbe.expectLayoutEngine('cache'));

      await test.step('AND Tab is pressed', async (): Promise<void> => graphPage.pressKey('Tab'));

      await test.step('THEN Fit is focused', async (): Promise<void> => graphPage.expectButtonFocused('Fit'));

      await test.step('WHEN Tab is pressed', async (): Promise<void> => graphPage.pressKey('Tab'));

      await test.step('THEN Re-layout is focused', async (): Promise<void> => graphPage.expectButtonFocused('Re-layout'));

      await test.step('WHEN Tab is pressed', async (): Promise<void> => graphPage.pressKey('Tab'));

      await test.step('THEN the graph container is focused', async (): Promise<void> => graphPage.expectContainerFocused());
    }
  );

  test(
    'GIVEN a selection made by tap and Fit focused, Tab walks Re-layout, Clear selection, then the container',
    { annotation: AC7 },
    async ({ graphCanvas, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('AND core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

      await test.step('AND the Fit button is focused', async (): Promise<void> => graphPage.focusButton('Fit'));

      await test.step('AND Tab is pressed', async (): Promise<void> => graphPage.pressKey('Tab'));

      await test.step('THEN Re-layout is focused', async (): Promise<void> => graphPage.expectButtonFocused('Re-layout'));

      await test.step('WHEN Tab is pressed', async (): Promise<void> => graphPage.pressKey('Tab'));

      await test.step('THEN Clear selection is focused', async (): Promise<void> => graphPage.expectButtonFocused('Clear selection'));

      await test.step('WHEN Tab is pressed', async (): Promise<void> => graphPage.pressKey('Tab'));

      await test.step('THEN the graph container is focused', async (): Promise<void> => graphPage.expectContainerFocused());
    }
  );
});
