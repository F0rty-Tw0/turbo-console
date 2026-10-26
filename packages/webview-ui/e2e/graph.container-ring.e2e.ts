import { test } from './graph-task.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { THEME_DARK_STUB } from './test/stubs/graph-theme.stub.ts';
import { GRAPH_LABEL } from '../src/graph/common/graph.const.ts';

const N4 = { description: 'U1 phase 2, N4', type: 'requirement' };

test.describe('FEATURE: graph container focus ring', () => {
  test(
    'GIVEN the details graph in the dark theme, tapping a node leaves the container focused with no ring',
    { annotation: N4 },
    async ({ graphCanvas, graphHost, graphLook, graphPage, graphPointer }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the dark theme is applied', async (): Promise<void> => graphLook.applyTheme(THEME_DARK_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('THEN the container is focused and draws no ring', async (): Promise<void> =>
        graphPointer.expectContainerFocusedWithoutRing());
    }
  );

  test(
    'GIVEN the details graph in the dark theme, tapping a link leaves the container focused with no ring',
    { annotation: N4 },
    async ({ graphHost, graphLink, graphLook, graphPage, graphPointer }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the dark theme is applied', async (): Promise<void> => graphLook.applyTheme(THEME_DARK_STUB));

      await test.step('AND the web to ui link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('THEN the container is focused and draws no ring', async (): Promise<void> =>
        graphPointer.expectContainerFocusedWithoutRing());
    }
  );

  test(
    'GIVEN the details graph in the dark theme, a key press after a node tap brings the ring back',
    { annotation: N4 },
    async ({ graphCanvas, graphHost, graphLook, graphPage, graphPointer }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the dark theme is applied', async (): Promise<void> => graphLook.applyTheme(THEME_DARK_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Shift is pressed', async (): Promise<void> => graphPage.pressKey('Shift'));

      await test.step('THEN the container draws its ring', async (): Promise<void> => graphPointer.expectContainerRing());
    }
  );

  test(
    'GIVEN the details graph in the dark theme and no pointer used, Tab into the container shows the ring',
    { annotation: N4 },
    async ({ graphHost, graphKeys, graphLook, graphPage, graphPointer }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the dark theme is applied', async (): Promise<void> => graphLook.applyTheme(THEME_DARK_STUB));

      await test.step('AND Tab reaches the graph', async (): Promise<void> => graphKeys.tabTo(GRAPH_LABEL));

      await test.step('THEN the container draws its ring', async (): Promise<void> => graphPointer.expectContainerRing());
    }
  );
});
