import { test } from './graph-task.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';

const TIDY = { description: 'U1 phase 2, U1-7 U1-8 N4', type: 'requirement' };

test.describe('FEATURE: graph pointer', () => {
  test(
    'GIVEN the details graph, the cursor is a pointer over a node and a link and default over empty canvas',
    { annotation: TIDY },
    async ({ graphHost, graphPage, graphPointer }): Promise<void> => {
      await test.step('WHEN the page is opened and the details graph is sent', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
      });

      await test.step('THEN the cursor over web is a pointer', async (): Promise<void> => {
        await graphPointer.moveToNode('web');
        await graphPointer.expectCursor('pointer');
      });

      await test.step('AND over the web to ui link a pointer', async (): Promise<void> => {
        await graphPointer.moveToLink('web', 'ui');
        await graphPointer.expectCursor('pointer');
      });

      await test.step('AND over empty canvas the default', async (): Promise<void> => {
        await graphPointer.moveToEmpty();
        await graphPointer.expectCursor('default');
      });

      await test.step('AND after leaving the canvas from a node the default', async (): Promise<void> => {
        await graphPointer.moveToNode('web');
        await graphPointer.moveOutside();
        await graphPointer.expectContainerCursor('default');
      });
    }
  );

  test(
    'GIVEN the details graph, a mouse press on a node, a link or empty canvas draws nothing around the pointer',
    { annotation: TIDY },
    async ({ graphHost, graphPage, graphPointer }): Promise<void> => {
      await test.step('WHEN the page is opened and the details graph is sent', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
      });

      await test.step('THEN pressing on web changes no pixel around it', async (): Promise<void> => {
        await graphPointer.moveToNode('web');
        await graphPointer.expectPressDrawsNothing();
      });

      await test.step('AND pressing on the web to ui link changes none', async (): Promise<void> => {
        await graphPointer.moveToLink('web', 'ui');
        await graphPointer.expectPressDrawsNothing();
      });

      await test.step('AND pressing on empty canvas changes none', async (): Promise<void> => {
        await graphPointer.moveToEmpty();
        await graphPointer.expectPressDrawsNothing();
      });
    }
  );
});
