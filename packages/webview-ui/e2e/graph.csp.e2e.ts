import { test } from './graph.fixture.ts';
import { DIAMOND_CHAIN_STUB } from './test/stubs/graph-state.stub.ts';

const AC5 = { description: 'M4-1 AC5', type: 'requirement' };

test.describe('FEATURE: graph page CSP', () => {
  test(
    'GIVEN the stub bridge and no host state, the page shows its pre-state with no violation or error',
    { annotation: AC5 },
    async ({ graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened without a VS Code host', async (): Promise<void> => graphPage.open({ host: false }));

      await test.step('THEN the toolbar and the empty graph container are shown, all three buttons disabled', async (): Promise<void> =>
        graphPage.expectPreState());

      await test.step('AND no node is drawn', async (): Promise<void> => graphProbe.expectNodeCount(0));

      await test.step('AND no CSP violation is recorded', async (): Promise<void> => graphPage.expectNoViolations());

      await test.step('AND no console or page error is logged', (): void => graphPage.expectNoErrors());
    }
  );

  test(
    'GIVEN the graph CSP, a graph renders through real ELK with no violation or error',
    { annotation: AC5 },
    async ({ graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_STUB));

      await test.step('THEN seven nodes are drawn', async (): Promise<void> => graphProbe.expectNodeCount(7));

      await test.step('AND the layout came from ELK', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

      await test.step('AND no CSP violation is recorded', async (): Promise<void> => graphPage.expectNoViolations());

      await test.step('AND no console or page error is logged', (): void => graphPage.expectNoErrors());
    }
  );

  test('GIVEN a VS Code host, the page posts exactly one ready', async ({ graphHost, graphPage }): Promise<void> => {
    await test.step('WHEN the page is opened inside the host', async (): Promise<void> => graphPage.open());

    await test.step('THEN the host received exactly one ready message', async (): Promise<void> =>
      graphHost.expectPosted([{ type: 'ready' }]));
  });

  test('GIVEN an inline script without the nonce, the CSP blocks it', { annotation: AC5 }, async ({ graphPage }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open({ inlineScript: true }));

    await test.step('THEN a CSP violation is recorded', async (): Promise<void> => graphPage.expectViolation());

    await test.step('AND the inline script did not run', async (): Promise<void> => graphPage.expectInlineScriptBlocked());
  });

  test(
    'GIVEN the graph CSP, an HTML string written to a DOM sink is refused',
    { annotation: AC5 },
    async ({ graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('THEN writing a string to innerHTML throws a TypeError', async (): Promise<void> =>
        graphPage.expectStringSinkRefused());
    }
  );

  test('GIVEN no probe flag, the page exposes no probe', async ({ graphPage, graphProbe }): Promise<void> => {
    await test.step('WHEN the page is opened without the probe flag', async (): Promise<void> => graphPage.open({ probe: false }));

    await test.step('THEN window.__tcGraphProbe is undefined', async (): Promise<void> => graphProbe.expectNoProbe());
  });
});
