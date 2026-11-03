import { expect, test } from './graph-task.fixture.ts';
import { BARE_TEXTS_STUB, FULL_TEXTS_STUB } from './test/stubs/graph-scope-names.stub.ts';
import { scopedNamesState, textsOf } from './test/utils/graph-scope-names.spec.util.ts';
import type { GraphSetViewToggleMessage } from '../src/bridge/common/graph-message.type.ts';

const SCOPE_TOGGLE = { description: 'U5 spec D13, §5 rows 20-21', type: 'requirement' };

const UNTICKED: GraphSetViewToggleMessage = { type: 'setViewToggle', toggle: 'scope', shown: false };

test.describe('FEATURE: package View checkbox Show package scopes', () => {
  test(
    'GIVEN the Controls panel is open, View lists Show package scopes, reflecting scopeShown from the first state and after a relabel',
    { annotation: SCOPE_TOGGLE },
    async ({ graphControls, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the graph is laid out with scopes shown', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(scopedNamesState(true));
        await graphProbe.expectLayoutSettled();
      });

      await test.step('THEN the box is ticked', async (): Promise<void> => graphControls.expectScope(true));

      await test.step('WHEN the same-hash state with scopes hidden arrives', async (): Promise<void> =>
        graphHost.sendState(scopedNamesState(false)));

      await test.step('THEN the box is unticked and nothing was posted', async (): Promise<void> => {
        await graphControls.expectScope(false);
        await graphControls.expectViewToggles([]);
      });
    }
  );

  test(
    'GIVEN a graph first drawn with scopes hidden, the box starts unticked',
    { annotation: SCOPE_TOGGLE },
    async ({ graphControls, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the graph is laid out with scopes hidden', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(scopedNamesState(false));
        await graphProbe.expectLayoutSettled();
      });

      await test.step('THEN the box is unticked and nothing was posted', async (): Promise<void> => {
        await graphControls.expectScope(false);
        await graphControls.expectViewToggles([]);
      });
    }
  );

  test(
    'GIVEN the scoped graph is laid out, unticking the box posts exactly one setViewToggle and the host answer posts none',
    { annotation: SCOPE_TOGGLE },
    async ({ graphControls, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the graph is laid out with scopes shown', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(scopedNamesState(true));
        await graphProbe.expectLayoutSettled();
      });

      await test.step('AND the box is unticked', async (): Promise<void> => graphControls.scope.uncheck());

      await test.step('THEN one message goes out', async (): Promise<void> => graphControls.expectViewToggles([UNTICKED]));

      await test.step('WHEN the host answers with the same-hash state hiding scopes', async (): Promise<void> =>
        graphHost.sendState(scopedNamesState(false)));

      await test.step('THEN the answer is handled, still exactly that one message, and the box is unticked', async (): Promise<void> => {
        await expect.poll(async (): Promise<string[][]> => textsOf(await graphProbe.nodes())).toEqual(BARE_TEXTS_STUB);
        await graphControls.expectViewToggles([UNTICKED]);
        await graphControls.expectScope(false);
      });
    }
  );

  test(
    'GIVEN the box was unticked and the host answered, a tree flip back to scopes shown ticks the box and posts nothing',
    { annotation: SCOPE_TOGGLE },
    async ({ graphControls, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the box was unticked and the host answered with scopes hidden', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(scopedNamesState(true));
        await graphProbe.expectLayoutSettled();
        await graphControls.scope.uncheck();
        await graphHost.sendState(scopedNamesState(false));
        await graphControls.expectScope(false);
      });

      await test.step('AND the tree flips scopes back and the host sends scopes shown', async (): Promise<void> =>
        graphHost.sendState(scopedNamesState(true)));

      await test.step('THEN the box is ticked, the nodes read the full names and still only the one message was posted', async (): Promise<void> => {
        await expect.poll(async (): Promise<string[][]> => textsOf(await graphProbe.nodes())).toEqual(FULL_TEXTS_STUB);
        await graphControls.expectScope(true);
        await graphControls.expectViewToggles([UNTICKED]);
      });
    }
  );

  test(
    'GIVEN the box has focus, Space unticks it and posts once',
    { annotation: SCOPE_TOGGLE },
    async ({ graphControls, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the graph is laid out with scopes shown', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(scopedNamesState(true));
        await graphProbe.expectLayoutSettled();
      });

      await test.step('AND Space is pressed on the box', async (): Promise<void> => graphControls.pressScope());

      await test.step('THEN one setViewToggle goes out and the box is unticked', async (): Promise<void> => {
        await graphControls.expectViewToggles([UNTICKED]);
        await graphControls.expectScope(false);
      });
    }
  );
});
