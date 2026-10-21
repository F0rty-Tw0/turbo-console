import type { EdgeStates, NodeStates } from './common/graph.type.ts';
import { test } from './graph.fixture.ts';
import { DIAMOND_CHAIN_CACHED_STUB } from './test/stubs/graph-state.stub.ts';

const AC2 = { description: 'M4-1 AC2', type: 'requirement' };

const UI_STATES: NodeStates = {
  ui: 'selected',
  core: 'highlighted',
  config: 'highlighted',
  base: 'highlighted',
  web: 'highlighted',
  data: 'dimmed',
  docs: 'dimmed'
};

const UI_EDGES: EdgeStates = {
  'web>ui': 'highlighted',
  'ui>core': 'highlighted',
  'core>config': 'highlighted',
  'config>base': 'highlighted',
  'web>data': 'dimmed',
  'data>core': 'dimmed'
};

const CORE_STATES: NodeStates = {
  core: 'selected',
  config: 'highlighted',
  base: 'highlighted',
  ui: 'highlighted',
  data: 'highlighted',
  web: 'highlighted',
  docs: 'dimmed'
};

const CORE_EDGES: EdgeStates = {
  'web>ui': 'highlighted',
  'web>data': 'highlighted',
  'ui>core': 'highlighted',
  'data>core': 'highlighted',
  'core>config': 'highlighted',
  'config>base': 'highlighted'
};

const DOCS_STATES: NodeStates = {
  docs: 'selected',
  core: 'dimmed',
  config: 'dimmed',
  base: 'dimmed',
  ui: 'dimmed',
  data: 'dimmed',
  web: 'dimmed'
};

const DOCS_EDGES: EdgeStates = {
  'web>ui': 'dimmed',
  'web>data': 'dimmed',
  'ui>core': 'dimmed',
  'data>core': 'dimmed',
  'core>config': 'dimmed',
  'config>base': 'dimmed'
};

test.describe('FEATURE: graph selection', () => {
  test(
    'GIVEN the diamond-and-chain graph, tapping ui lights exactly its transitive closure',
    { annotation: AC2 },
    async ({ graphCanvas, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('AND ui is tapped', async (): Promise<void> => graphCanvas.tapNode('ui'));

      await test.step('THEN ui is selected, its closure highlighted, the rest dimmed', async (): Promise<void> =>
        graphProbe.expectNodeStates(UI_STATES));

      await test.step('AND only the edges among them are highlighted', async (): Promise<void> =>
        graphProbe.expectEdgeStates(UI_EDGES));

      await test.step('AND the status line counts them', async (): Promise<void> =>
        graphPage.expectStatus('ui: 3 dependencies, 1 dependents'));
    }
  );

  test(
    'GIVEN the diamond-and-chain graph, tapping core lights both of its sides',
    { annotation: AC2 },
    async ({ graphCanvas, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('AND core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

      await test.step('THEN core is selected, everything but docs highlighted', async (): Promise<void> =>
        graphProbe.expectNodeStates(CORE_STATES));

      await test.step('AND every edge is highlighted', async (): Promise<void> => graphProbe.expectEdgeStates(CORE_EDGES));

      await test.step('AND the status line counts them', async (): Promise<void> =>
        graphPage.expectStatus('core: 2 dependencies, 3 dependents'));
    }
  );

  test(
    'GIVEN the diamond-and-chain graph, tapping the isolated docs lights nothing else',
    { annotation: AC2 },
    async ({ graphCanvas, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('AND docs is tapped', async (): Promise<void> => graphCanvas.tapNode('docs'));

      await test.step('THEN docs is selected and every other node dimmed', async (): Promise<void> =>
        graphProbe.expectNodeStates(DOCS_STATES));

      await test.step('AND every edge is dimmed', async (): Promise<void> => graphProbe.expectEdgeStates(DOCS_EDGES));

      await test.step('AND the status line counts none', async (): Promise<void> =>
        graphPage.expectStatus('docs: 0 dependencies, 0 dependents'));
    }
  );

  test('GIVEN a selected package, Escape on the container clears it', async ({
    graphCanvas,
    graphHost,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

    await test.step('AND core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

    await test.step('AND the container is focused', async (): Promise<void> => graphPage.focusContainer());

    await test.step('THEN core is selected', async (): Promise<void> => graphProbe.expectSelected('core'));

    await test.step('WHEN Escape is pressed', async (): Promise<void> => graphPage.pressKey('Escape'));

    await test.step('THEN nothing is selected', async (): Promise<void> => graphProbe.expectSelected(null));

    await test.step('AND Clear selection is disabled', async (): Promise<void> => graphPage.expectDisabled('Clear selection'));
  });

  test('GIVEN a selected package, tapping the background clears it', async ({
    graphCanvas,
    graphHost,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

    await test.step('AND core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

    await test.step('THEN core is selected', async (): Promise<void> => graphProbe.expectSelected('core'));

    await test.step('WHEN the background is tapped', async (): Promise<void> => graphCanvas.tapBackground());

    await test.step('THEN nothing is selected', async (): Promise<void> => graphProbe.expectSelected(null));
  });

  test('GIVEN a cached graph, double-tapping a package posts openDetails for it', async ({
    graphCanvas,
    graphHost,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

    await test.step('AND core is double-tapped', async (): Promise<void> => graphCanvas.doubleTapNode('core'));

    await test.step('THEN the host received openDetails for core', async (): Promise<void> => graphHost.expectOpenDetails('core'));
  });
});
