import { test } from './graph.fixture.ts';
import { DIAMOND_CHAIN_STUB } from './test/stubs/graph-state.stub.ts';

const AC4 = { description: 'M4-1 AC4', type: 'requirement' };

test.describe('FEATURE: graph layout fallback', () => {
  test(
    'GIVEN a worker constructor that throws once, the page falls back and Retry gives an ELK layout',
    { annotation: AC4 },
    async ({ graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened with a throwing worker', async (): Promise<void> =>
        graphPage.open({ workers: 'throwOnce' }));

      await test.step('AND a graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_STUB));

      await test.step('THEN the simplified-layout notice shows with Retry', async (): Promise<void> =>
        graphPage.expectFallbackNotice());

      await test.step('AND the layout is the fallback', async (): Promise<void> => graphProbe.expectLayoutEngine('fallback'));

      await test.step('AND layoutDone reports fallback and no positions were posted', async (): Promise<void> =>
        graphHost.expectFallbackPosted());

      await test.step('AND no two nodes share a position', async (): Promise<void> => graphProbe.expectDistinctPositions());

      await test.step('WHEN Retry is pressed', async (): Promise<void> => graphPage.pressButton('Retry'));

      await test.step('THEN the layout is ELK', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

      await test.step('AND the notice is gone', async (): Promise<void> => graphPage.expectNoNotice());

      await test.step('AND the positions were posted', async (): Promise<void> =>
        graphHost.expectPositionsPosted('a1b2c3d4', DIAMOND_CHAIN_STUB.packages));
    }
  );

  test(
    'GIVEN a worker that dispatches an error event, the page falls back and never posts positions',
    { annotation: AC4 },
    async ({ graphCanvas, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened with an erroring worker', async (): Promise<void> =>
        graphPage.open({ workers: 'error' }));

      await test.step('AND a graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_STUB));

      await test.step('THEN the simplified-layout notice shows with Retry', async (): Promise<void> =>
        graphPage.expectFallbackNotice());

      await test.step('AND the layout is the fallback', async (): Promise<void> => graphProbe.expectLayoutEngine('fallback'));

      await test.step('AND layoutDone reports fallback and no positions were posted', async (): Promise<void> =>
        graphHost.expectFallbackPosted());

      await test.step('AND the failed worker was terminated', async (): Promise<void> => graphHost.expectTerminated(1));

      await test.step('WHEN a node is dragged', async (): Promise<void> => graphCanvas.dragNode('ui', 30, 30));

      await test.step('THEN still no positions were posted', async (): Promise<void> => graphHost.expectNoPositionsPosted());

      await test.step('WHEN Re-layout is pressed', async (): Promise<void> => graphPage.pressButton('Re-layout'));

      await test.step('THEN layoutDone reports fallback twice', async (): Promise<void> =>
        graphHost.expectLayoutDones(['fallback', 'fallback']));

      await test.step('AND the simplified-layout notice still shows with Retry', async (): Promise<void> =>
        graphPage.expectFallbackNotice());

      await test.step('AND the layout is still the fallback', async (): Promise<void> => graphProbe.expectLayoutEngine('fallback'));
    }
  );

  test(
    'GIVEN a worker that never answers, the page falls back after the timeout',
    { annotation: AC4 },
    async ({ graphHost, graphPage, graphProbe, pageClock }): Promise<void> => {
      await test.step('WHEN the fake clock is installed', async (): Promise<void> => pageClock.install());

      await test.step('AND the page is opened with a silent worker', async (): Promise<void> => graphPage.open({ workers: 'silent' }));

      await test.step('AND a graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_STUB));

      await test.step('THEN one worker was created', async (): Promise<void> => graphHost.expectWorkers(1));

      await test.step('WHEN five seconds pass', async (): Promise<void> => pageClock.tick(5000));

      await test.step('THEN the simplified-layout notice shows with Retry', async (): Promise<void> =>
        graphPage.expectFallbackNotice());

      await test.step('AND the layout is the fallback', async (): Promise<void> => graphProbe.expectLayoutEngine('fallback'));

      await test.step('AND the silent worker was terminated', async (): Promise<void> => graphHost.expectTerminated(1));

      await test.step('AND layoutDone reports fallback and no positions were posted', async (): Promise<void> =>
        graphHost.expectFallbackPosted());
    }
  );

  test('GIVEN label sizing that throws, the page says the graph could not be drawn instead of loading forever', async ({
    graphHost,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the page is opened with a canvas whose measureText throws', async (): Promise<void> =>
      graphPage.open({ isMeasureBroken: true }));

    await test.step('AND a graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_STUB));

    await test.step('THEN the page says the graph could not be drawn', async (): Promise<void> => graphPage.expectLayoutFailed());

    await test.step('AND the loading message is gone', async (): Promise<void> => graphPage.expectNotLoading());

    await test.step('AND no console or page error is logged', (): void => graphPage.expectNoErrors());
  });
});
