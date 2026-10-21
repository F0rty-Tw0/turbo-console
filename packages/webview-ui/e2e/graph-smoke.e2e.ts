import { test } from './graph-smoke.fixture.ts';
import type { GraphEdge, GraphState } from '../src/bridge/common/graph-state.type.ts';

const EDGES: GraphEdge[] = [
  { source: 'app', target: 'lib-a' },
  { source: 'app', target: 'lib-b' },
  { source: 'lib-a', target: 'core' },
  { source: 'lib-b', target: 'core' }
];

const STATE: GraphState = {
  kind: 'graph',
  hash: 'smoke-1',
  positions: null,
  packages: ['app', 'core', 'lib-a', 'lib-b'],
  edges: EDGES
};

test.describe('FEATURE: graph page smoke', () => {
  test('GIVEN a graph state, the page lays out and renders every package', async ({ graphPage }): Promise<void> => {
    await test.step('WHEN the page opens with the probe and the state arrives', async (): Promise<void> => {
      await graphPage.goto({ probe: true });
      await graphPage.postState(STATE);
    });

    await test.step('THEN 4 nodes and 4 edges are drawn, none stacked at one point', async (): Promise<void> => {
      await graphPage.expectNodeCount(4);
      await graphPage.expectEdgeCount(4);
      await graphPage.expectDistinctCentres();
    });

    await test.step('AND the host got positions for all 4 packages and layoutDone from elk', async (): Promise<void> =>
      graphPage.expectLayoutPosted('smoke-1', 4));

    await test.step('AND no CSP violation is recorded', async (): Promise<void> => graphPage.expectNoViolations());
  });

  test('GIVEN no probe flag, the page exposes no probe', async ({ graphPage }): Promise<void> => {
    await test.step('WHEN the page opens without the flag', async (): Promise<void> => graphPage.goto({ probe: false }));

    await test.step('THEN window.__tcGraphProbe is undefined', async (): Promise<void> => graphPage.expectNoProbe());
  });
});
