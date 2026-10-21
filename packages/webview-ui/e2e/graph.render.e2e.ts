import type { EdgeStates } from './common/graph.type.ts';
import { test } from './graph.fixture.ts';
import {
  ARROW_NAMES_STUB,
  CONSTRUCTOR_UNCACHED_STUB,
  DIAMOND_CHAIN_CACHED_STUB,
  DIAMOND_CHAIN_STUB,
  ERROR_STUB,
  LOADING_STUB,
  MONOREPO_ROOT_STUB,
  NO_EDGES_STUB,
  OBJECT_MEMBER_NAMES_STUB,
  SINGLE_PACKAGE_STUB
} from './test/stubs/graph-state.stub.ts';
import { stateNamesOf } from './test/utils/graph-package.spec.util.ts';

const AC1 = { description: 'M4-1 AC1', type: 'requirement' };

const RF5 = { description: 'M4-1 Review Focus 5', type: 'requirement' };

const DIAMOND_EDGES_NORMAL: EdgeStates = {
  'web>ui': 'normal',
  'web>data': 'normal',
  'ui>core': 'normal',
  'data>core': 'normal',
  'core>config': 'normal',
  'config>base': 'normal'
};

test.describe('FEATURE: graph render', () => {
  test(
    'GIVEN the diamond-and-chain graph, every package and edge is drawn',
    { annotation: AC1 },
    async ({ graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_STUB));

      await test.step('THEN every package is a node', async (): Promise<void> =>
        graphProbe.expectNodeIds(stateNamesOf(DIAMOND_CHAIN_STUB)));

      await test.step('AND every edge is drawn once, none highlighted or dimmed', async (): Promise<void> =>
        graphProbe.expectEdgeStates(DIAMOND_EDGES_NORMAL));
    }
  );

  test('GIVEN a graph with no edges, the nodes are drawn alone', async ({ graphHost, graphPage, graphProbe }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND the edgeless graph state is sent', async (): Promise<void> => graphHost.sendState(NO_EDGES_STUB));

    await test.step('THEN seven nodes are drawn', async (): Promise<void> => graphProbe.expectNodeCount(7));

    await test.step('AND no edge is drawn', async (): Promise<void> => graphProbe.expectEdgeCount(0));
  });

  test(
    'GIVEN a root // package and an edge to an unlisted package, the root is drawn and the dangling edge is dropped',
    { annotation: RF5 },
    async ({ graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the monorepo-root graph state is sent', async (): Promise<void> => graphHost.sendState(MONOREPO_ROOT_STUB));

      await test.step('THEN every listed package is a node, the // root among them', async (): Promise<void> =>
        graphProbe.expectNodeIds(stateNamesOf(MONOREPO_ROOT_STUB)));

      await test.step('AND only the six edges with both ends listed are drawn', async (): Promise<void> =>
        graphProbe.expectEdgeCount(6));

      await test.step('AND no console or page error is logged', (): void => graphPage.expectNoErrors());
    }
  );

  test('GIVEN a loading state, the page says it is loading packages', async ({ graphHost, graphPage }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND the loading state is sent', async (): Promise<void> => graphHost.sendState(LOADING_STUB));

    await test.step('THEN the page says "Loading packages…"', async (): Promise<void> => graphPage.expectText('Loading packages…'));
  });

  test('GIVEN an error state, the message shows and Reload posts reload', async ({ graphHost, graphPage }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND the error state is sent', async (): Promise<void> => graphHost.sendState(ERROR_STUB));

    await test.step('THEN the error message is shown', async (): Promise<void> => graphPage.expectText('turbo exited with code 1'));

    await test.step('WHEN Reload is pressed', async (): Promise<void> => graphPage.pressButton('Reload'));

    await test.step('THEN the host received ready, then reload', async (): Promise<void> =>
      graphHost.expectPosted([{ type: 'ready' }, { type: 'reload' }]));
  });

  test('GIVEN a drawn graph, a single-package state replaces it with the no-graph text', async ({
    graphHost,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

    await test.step('THEN seven nodes are drawn', async (): Promise<void> => graphProbe.expectNodeCount(7));

    await test.step('WHEN the single-package state is sent', async (): Promise<void> => graphHost.sendState(SINGLE_PACKAGE_STUB));

    await test.step('THEN the page says it is a single-package repo', async (): Promise<void> =>
      graphPage.expectText('This is a single-package repo, so there is no package graph'));

    await test.step('AND the graph container and the toolbar are hidden', async (): Promise<void> => graphPage.expectGraphHidden());
  });

  test('GIVEN a zoomed-in graph, Fit shows every node inside the container', async ({
    graphCanvas,
    graphHost,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

    await test.step('AND the graph is zoomed in', async (): Promise<void> => graphCanvas.zoomBy(-600));

    await test.step('THEN a node lies outside the container', async (): Promise<void> => graphCanvas.expectNodeOutOfView());

    await test.step('WHEN Fit is pressed', async (): Promise<void> => graphPage.pressButton('Fit'));

    await test.step('THEN every node lies inside the container', async (): Promise<void> => graphCanvas.expectAllNodesInView());
  });

  test('GIVEN package names that hold >, every node and every edge is drawn', async ({
    graphHost,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND the state is sent', async (): Promise<void> => graphHost.sendState(ARROW_NAMES_STUB));

    await test.step('THEN every package is a node', async (): Promise<void> =>
      graphProbe.expectNodeIds(stateNamesOf(ARROW_NAMES_STUB)));

    await test.step('AND all three edges are drawn', async (): Promise<void> => graphProbe.expectEdgeCount(3));

    await test.step('AND ELK laid them out', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

    await test.step('AND no console or page error is logged', (): void => graphPage.expectNoErrors());
  });

  test('GIVEN packages named like Object members, ELK places each at its own finite spot and the page posts them all', async ({
    graphHost,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND the state is sent', async (): Promise<void> => graphHost.sendState(OBJECT_MEMBER_NAMES_STUB));

    await test.step('THEN the layout came from ELK', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

    await test.step('AND every package is a node', async (): Promise<void> =>
      graphProbe.expectNodeIds(stateNamesOf(OBJECT_MEMBER_NAMES_STUB)));

    await test.step('AND no two nodes share a position, and none is off the number line', async (): Promise<void> =>
      graphProbe.expectDistinctPositions());

    await test.step('AND the posted positions hold an own key for every package', async (): Promise<void> =>
      graphHost.expectPositionsPosted(OBJECT_MEMBER_NAMES_STUB.hash, stateNamesOf(OBJECT_MEMBER_NAMES_STUB)));

    await test.step('AND no console or page error is logged', (): void => graphPage.expectNoErrors());
  });

  test('GIVEN cached positions that leave out a package named constructor, it is drawn and Object is left alone', async ({
    graphHost,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND the state is sent', async (): Promise<void> => graphHost.sendState(CONSTRUCTOR_UNCACHED_STUB));

    await test.step('THEN every package is a node', async (): Promise<void> =>
      graphProbe.expectNodeIds(stateNamesOf(CONSTRUCTOR_UNCACHED_STUB)));

    await test.step('AND no two nodes share a position, and none is off the number line', async (): Promise<void> =>
      graphProbe.expectDistinctPositions());

    await test.step('AND no x or y was written onto Object or its members', async (): Promise<void> =>
      graphPage.expectBuiltinsUntouched());
  });
});
