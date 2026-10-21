import { test } from './graph.fixture.ts';
import {
  DIAMOND_CHAIN_CACHED_STUB,
  DIAMOND_CHAIN_POSITIONS_STUB,
  DIAMOND_CHAIN_STUB,
  EDITED_STUB,
  OTHER_HASH_CACHED_STUB
} from './test/stubs/graph-state.stub.ts';

const RF1 = { description: 'M4-1 Review Focus 1', type: 'requirement' };

test.describe('FEATURE: graph layout', () => {
  test('GIVEN a state without positions, ELK lays the graph out top-down and the page posts it', async ({
    graphHost,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND a graph state without positions is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_STUB));

    await test.step('THEN the layout came from ELK', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

    await test.step('AND the loading message is gone', async (): Promise<void> => graphPage.expectNotLoading());

    await test.step('AND dependents sit above their dependencies', async (): Promise<void> =>
      graphProbe.expectRowsDescending(['web', 'ui', 'core', 'config', 'base']));

    await test.step('AND nodes are 32 px tall and the longer label is wider', async (): Promise<void> =>
      graphProbe.expectNodeSizes('web', 'config'));

    await test.step('AND the nodes sit at the positions the page posted', async (): Promise<void> =>
      graphProbe.expectNodesAtPostedPositions());

    await test.step('AND the posted positions name the state hash and every package', async (): Promise<void> =>
      graphHost.expectPositionsPosted('a1b2c3d4', DIAMOND_CHAIN_STUB.packages));

    await test.step('AND layoutDone reports elk', async (): Promise<void> => graphHost.expectLayoutDone('elk'));

    await test.step('AND exactly one worker was created', async (): Promise<void> => graphHost.expectWorkers(1));
  });

  test(
    'GIVEN a second state posted while ELK runs, only the second graph is laid out',
    { annotation: RF1 },
    async ({ graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND two states are sent back to back', async (): Promise<void> =>
        graphHost.sendStates([DIAMOND_CHAIN_STUB, EDITED_STUB]));

      await test.step('THEN the nodes are the second graph', async (): Promise<void> =>
        graphProbe.expectNodeIds(EDITED_STUB.packages));

      await test.step('AND the layout came from ELK', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

      await test.step('AND no simplified-layout notice is shown', async (): Promise<void> => graphPage.expectNoNotice());

      await test.step('AND positions were posted only for the second hash', async (): Promise<void> =>
        graphHost.expectPositionsOnlyFor('e5f6a7b8'));

      await test.step('AND no two nodes share a position', async (): Promise<void> => graphProbe.expectDistinctPositions());
    }
  );

  test('GIVEN a state with positions, the page draws it without creating a worker', async ({
    graphHost,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

    await test.step('THEN the layout came from the cache', async (): Promise<void> => graphProbe.expectLayoutEngine('cache'));

    await test.step('AND the nodes sit at the cached positions', async (): Promise<void> =>
      graphProbe.expectNodesAt(DIAMOND_CHAIN_POSITIONS_STUB));

    await test.step('AND no worker was created', async (): Promise<void> => graphHost.expectWorkers(0));

    await test.step('AND no positions were posted', async (): Promise<void> => graphHost.expectNoPositionsPosted());
  });

  test('GIVEN cached positions, Re-layout runs ELK anyway', async ({ graphHost, graphPage, graphProbe }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

    await test.step('THEN the graph is drawn from the cache', async (): Promise<void> => graphProbe.expectLayoutEngine('cache'));

    await test.step('WHEN Re-layout is pressed', async (): Promise<void> => graphPage.pressButton('Re-layout'));

    await test.step('THEN the layout is ELK', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

    await test.step('AND one worker was created', async (): Promise<void> => graphHost.expectWorkers(1));

    await test.step('AND the new positions were posted', async (): Promise<void> =>
      graphHost.expectPositionsPosted('a1b2c3d4', DIAMOND_CHAIN_STUB.packages));
  });

  test('GIVEN an ELK layout, dragging a node posts the new positions', async ({
    graphCanvas,
    graphHost,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND a graph state without positions is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_STUB));

    await test.step('THEN the layout came from ELK', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

    await test.step('WHEN ui is dragged by 60 px right and 40 px down', async (): Promise<void> => graphCanvas.dragNode('ui', 60, 40));

    await test.step('THEN the last posted positions moved ui by the drag and name every package', async (): Promise<void> =>
      graphCanvas.expectDragPosted());
  });

  test('GIVEN an ELK layout and a dragged node, a re-post of the same graph changes nothing', async ({
    graphCanvas,
    graphHost,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND a graph state without positions is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_STUB));

    await test.step('THEN the layout came from ELK', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

    await test.step('WHEN ui is dragged by 60 px right and 40 px down', async (): Promise<void> => graphCanvas.dragNode('ui', 60, 40));

    await test.step('THEN the drag is posted', async (): Promise<void> => graphCanvas.expectDragPosted());

    await test.step('WHEN the same state is sent again', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_STUB));

    await test.step('AND two frames pass', async (): Promise<void> => graphPage.waitFrames());

    await test.step('THEN the page does not show Loading', async (): Promise<void> => graphPage.expectNotLoadingNow());

    await test.step('AND ELK did not run again', async (): Promise<void> => graphHost.expectLayoutDones(['elk']));

    await test.step('AND the nodes still sit where the drag left them', async (): Promise<void> =>
      graphProbe.expectNodesAtPostedPositions());
  });

  test('GIVEN a state with positions sent while ELK lays out an older one, the cached positions stay', async ({
    graphHost,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND a state without positions, then another hash with positions, are sent', async (): Promise<void> =>
      graphHost.sendStates([DIAMOND_CHAIN_STUB, OTHER_HASH_CACHED_STUB]));

    await test.step('THEN ELK has answered its register and layout commands', async (): Promise<void> =>
      graphHost.expectWorkerMessages(2));

    await test.step('AND the layout came from the cache', async (): Promise<void> => graphProbe.expectLayoutEngine('cache'));

    await test.step('AND the nodes sit at the cached positions', async (): Promise<void> =>
      graphProbe.expectNodesAt(DIAMOND_CHAIN_POSITIONS_STUB));

    await test.step('AND no positions were posted', async (): Promise<void> => graphHost.expectNoPositionsPosted());
  });

  test('GIVEN an older layout that throws after a cached state replaced it, the cached graph stays', async ({
    graphHost,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened with a worker that answers a malformed layout', async (): Promise<void> =>
      graphPage.open({ workers: 'malformed' }));

    await test.step('AND a state without positions, then another hash with positions, are sent', async (): Promise<void> =>
      graphHost.sendStates([DIAMOND_CHAIN_STUB, OTHER_HASH_CACHED_STUB]));

    await test.step('AND the worker has answered its register and layout commands', async (): Promise<void> =>
      graphHost.expectWorkerMessages(2));

    await test.step('AND two frames pass', async (): Promise<void> => graphPage.waitFrames());

    await test.step('THEN the page does not say the graph could not be drawn', async (): Promise<void> =>
      graphPage.expectNotFailedNow());

    await test.step('AND the layout came from the cache', async (): Promise<void> => graphProbe.expectLayoutEngine('cache'));

    await test.step('AND the nodes sit at the cached positions', async (): Promise<void> =>
      graphProbe.expectNodesAt(DIAMOND_CHAIN_POSITIONS_STUB));

    await test.step('AND no console or page error is logged', (): void => graphPage.expectNoErrors());
  });
});
