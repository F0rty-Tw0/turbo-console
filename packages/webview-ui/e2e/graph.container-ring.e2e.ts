import { test } from './graph-task.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { THEME_DARK_STUB } from './test/stubs/graph-theme.stub.ts';
import { GRAPH_LABEL } from '../src/graph/common/graph.const.ts';

const TIDY = { description: 'U1 phase 2, U1-8 N4', type: 'requirement' };

test.describe('FEATURE: graph container focus ring', () => {
  test.beforeEach(async ({ graphHost, graphLook, graphPage }): Promise<void> => {
    await graphPage.open();
    await graphHost.sendState(DETAILS_STUB);
    await graphLook.applyTheme(THEME_DARK_STUB);
  });

  test(
    'GIVEN a node tapped, the container holds focus and draws no ring',
    { annotation: TIDY },
    async ({ graphCanvas, graphPointer }): Promise<void> => {
      await test.step('WHEN web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('THEN the container is focused and draws no ring', async (): Promise<void> => {
        await graphPointer.expectContainerFocused();
        await graphPointer.expectContainerRing(false);
      });
    }
  );

  test(
    'GIVEN a link tapped, the container holds focus and draws no ring',
    { annotation: TIDY },
    async ({ graphLink, graphPointer }): Promise<void> => {
      await test.step('WHEN the web to ui link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('THEN the container is focused and draws no ring', async (): Promise<void> => {
        await graphPointer.expectContainerFocused();
        await graphPointer.expectContainerRing(false);
      });
    }
  );

  test(
    'GIVEN a node tapped, a key press brings the ring back',
    { annotation: TIDY },
    async ({ graphCanvas, graphPage, graphPointer }): Promise<void> => {
      await test.step('WHEN web is tapped and Shift is pressed', async (): Promise<void> => {
        await graphCanvas.tapNode('web');
        await graphPage.pressKey('Shift');
      });

      await test.step('THEN the container draws its ring', async (): Promise<void> => graphPointer.expectContainerRing(true));
    }
  );

  test(
    'GIVEN no pointer used, Tab into the container shows the ring',
    { annotation: TIDY },
    async ({ graphKeys, graphPointer }): Promise<void> => {
      await test.step('WHEN Tab reaches the graph', async (): Promise<void> => graphKeys.tabTo(GRAPH_LABEL));

      await test.step('THEN the container draws its ring', async (): Promise<void> => graphPointer.expectContainerRing(true));
    }
  );
});
